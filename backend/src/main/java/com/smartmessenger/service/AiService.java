package com.smartmessenger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmessenger.dto.AiChatRequest;
import com.smartmessenger.dto.AiResponseDto;
import com.smartmessenger.dto.AiSummaryRequest;
import com.smartmessenger.model.Message;
import com.smartmessenger.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.server.ResponseStatusException;
import com.smartmessenger.service.ChatService;
import com.smartmessenger.security.UserDetailsImpl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.stream.Collectors;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import javax.net.ssl.SSLException;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.api-url}")
    private String apiUrl;

    @Value("${app.gemini.connect-timeout-ms:10000}")
    private int connectTimeoutMs = 10000;

    @Value("${app.gemini.read-timeout-ms:60000}")
    private int readTimeoutMs = 60000;

    private final MessageRepository messageRepository;
    private final ChatService chatService;
    private final RestTemplate restTemplate = createClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static RestTemplate createClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(60000);
        return new RestTemplate(factory);
    }

    @PostConstruct
    void configureTimeouts() {
        if (connectTimeoutMs <= 0 || readTimeoutMs <= 0) throw new IllegalArgumentException("Gemini timeouts must be positive");
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        restTemplate.setRequestFactory(factory);
    }

    public AiResponseDto chatWithAi(AiChatRequest request, Long userId) {
        if (request.getPrompt().length() > 4000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi tối đa 4000 ký tự");
        if (request.getConversationId() != null) chatService.requireMember(request.getConversationId(), userId);
        String systemInstruction = "Bạn là Trợ lý AI thông minh tích hợp trong hệ thống Smart Messenger. Hãy trả lời ngắn gọn, thân thiện và hữu ích bằng tiếng Việt.";
        String prompt = systemInstruction + "\n\nNgười dùng: " + request.getPrompt();

        String responseText = callGeminiApi(prompt);
        return AiResponseDto.builder()
                .response(responseText)
                .model("Gemini")
                .build();
    }

    public AiResponseDto summarizeConversation(AiSummaryRequest request, Long userId) {
        chatService.requireMember(request.getConversationId(), userId);
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtDesc(request.getConversationId(),
                org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
        if (messages.isEmpty()) {
            return AiResponseDto.builder()
                    .response("Cuộc trò chuyện này chưa có tin nhắn nào để tóm tắt.")
                    .model("Gemini")
                    .build();
        }

        // Ghép lịch sử tin nhắn
        String history = messages.stream().filter(m -> !m.isDeleted() && m.getMessageType() == com.smartmessenger.model.MessageType.TEXT)
                .limit(50)
                .map(m -> (m.getSender() != null ? m.getSender().getFullName() : "Hệ thống") + ": " + m.getContent())
                .collect(Collectors.joining("\n"));
        if (history.isBlank()) {
            return AiResponseDto.builder().response("Cuộc trò chuyện chưa có tin nhắn văn bản để tóm tắt.").model("Gemini").build();
        }
        if (history.length() > 12000) history = history.substring(0, 12000);

        String prompt = "Dưới đây là lịch sử cuộc trò chuyện trong phòng chat Smart Messenger:\n\n"
                + history
                + "\n\nHãy tóm tắt ngắn gọn các ý chính, quyết định hoặc nội dung quan trọng của cuộc trò chuyện trên dưới dạng gạch đầu dòng rõ ràng bằng tiếng Việt.";

        String responseText = callGeminiApi(prompt);
        return AiResponseDto.builder()
                .response(responseText)
                .model("Gemini")
                .build();
    }

    private String callGeminiApi(String prompt) {
        // Không trả lời giả khi thiếu cấu hình.
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("YOUR_GEMINI_API_KEY_HERE")) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa có GEMINI_API_KEY. Hãy thêm API key lấy từ Google AI Studio vào cấu hình chạy backend.");
        }
        if (apiKey.trim().startsWith("gen-lang-client-")) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Bạn đang dùng Project ID thay cho Gemini API key. Hãy sao chép API key trong Google AI Studio.");
        }

        try {
            String url = apiUrl.trim();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey.trim());

            // Cấu trúc payload chuẩn của Gemini API
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", prompt);

            Map<String, Object> parts = new HashMap<>();
            parts.put("parts", Collections.singletonList(textPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(parts));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode rootNode = objectMapper.readTree(response.getBody());
                JsonNode candidates = rootNode.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    StringBuilder answer = new StringBuilder();
                    for (JsonNode part : candidates.get(0).path("content").path("parts")) {
                        if (part.hasNonNull("text")) answer.append(part.path("text").asText());
                    }
                    if (!answer.isEmpty()) return answer.toString();
                }
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini không trả về nội dung");
        } catch (HttpStatusCodeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, explainGeminiError(e));
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, explainTransportError(e));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không đọc được phản hồi Gemini");
        }
    }

    private String explainTransportError(ResourceAccessException error) {
        String code = "GEMINI_IO";
        String detail = "Backend Java không kết nối được Gemini. Kiểm tra mạng/proxy của tiến trình Java.";
        StringBuilder types = new StringBuilder();
        Throwable cause = error;
        for (int i = 0; cause != null && i < 12; i++, cause = cause.getCause()) {
            if (!types.isEmpty()) types.append(" -> ");
            types.append(cause.getClass().getSimpleName());
            if (cause instanceof SSLException) {
                code = "GEMINI_TLS";
                detail = "Java không xác thực được kết nối SSL/TLS tới Gemini. Cần kiểm tra chứng chỉ/JDK hoặc proxy trên máy chạy backend.";
            } else if (cause instanceof UnknownHostException) {
                code = "GEMINI_DNS";
                detail = "Java không phân giải được tên miền Gemini. Kiểm tra DNS/mạng của máy chạy backend.";
            } else if (cause instanceof SocketTimeoutException) {
                boolean connecting = cause.getMessage() != null && cause.getMessage().toLowerCase(Locale.ROOT).contains("connect");
                code = connecting ? "GEMINI_CONNECT_TIMEOUT" : "GEMINI_READ_TIMEOUT";
                detail = connecting ? "Java hết thời gian mở kết nối tới Gemini. Kiểm tra mạng, proxy hoặc tường lửa."
                        : "Gemini chưa phản hồi trong thời gian chờ của backend (" + readTimeoutMs / 1000 + " giây). Hãy thử lại.";
            } else if (cause instanceof ConnectException) {
                code = "GEMINI_CONNECT";
                detail = "Kết nối từ Java tới Gemini bị từ chối. Kiểm tra proxy, VPN hoặc tường lửa.";
            }
        }
        // Record only error classes; never log API keys, headers, URLs or prompts.
        log.warn("Gemini transport error: code={}, causes={}", code, types);
        return detail + " [" + code + "]";
    }

    private String explainGeminiError(HttpStatusCodeException e) {
        int code = e.getStatusCode().value();
        String detail = "";
        try { detail = objectMapper.readTree(e.getResponseBodyAsString()).path("error").path("message").asText(""); }
        catch (Exception ignored) { /* Phản hồi lỗi không phải JSON */ }
        String normalized = detail.toLowerCase(Locale.ROOT);
        if (normalized.contains("api key not valid") || normalized.contains("api_key_invalid"))
            return "Gemini API key không hợp lệ. Hãy sao chép lại API key từ Google AI Studio.";
        if (code == 429) return "Gemini đã hết hạn mức hoặc đang giới hạn yêu cầu. Hãy thử lại sau.";
        if (code == 401 || code == 403) return "Gemini từ chối API key hoặc dự án chưa được cấp quyền (" + code + ").";
        if (code == 404) return "Không tìm thấy mô hình Gemini. Hãy kiểm tra GEMINI_API_URL.";
        if (code == 400) {
            if (normalized.contains("model") || normalized.contains("not supported"))
                return "Mô hình Gemini trong GEMINI_API_URL không hỗ trợ yêu cầu này (400).";
            // Không đưa nguyên phản hồi của nhà cung cấp vào trình duyệt vì có thể chứa dữ liệu nhạy cảm.
            return "Yêu cầu gửi tới Gemini không hợp lệ (400). Kiểm tra API key và cấu hình mô hình.";
        }
        return "Gemini gặp lỗi (" + code + "). Vui lòng thử lại sau.";
    }
}
