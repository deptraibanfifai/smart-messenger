package com.smartmessenger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmessenger.dto.*;
import com.smartmessenger.model.Message;
import com.smartmessenger.model.MessageType;
import com.smartmessenger.repository.MessageRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;

import javax.net.ssl.SSLException;
import java.net.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {
    private static final String SYSTEM = "Bạn là AI trong Smart Messenger. Trả lời bằng tiếng Việt, rõ ràng và hữu ích. "
            + "Chỉ hỗ trợ hỏi đáp, giải thích, gợi ý và viết nội dung; không giả vờ đã thực hiện hành động ngoài hệ thống.";
    private final MessageRepository messageRepository;
    private final ChatService chatService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.groq.api-key:}")
    private String apiKey;
    @Value("${app.groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;
    @Value("${app.groq.model:openai/gpt-oss-120b}")
    private String model;
    @Value("${app.groq.connect-timeout-ms:10000}")
    private int connectTimeoutMs = 10000;
    @Value("${app.groq.read-timeout-ms:60000}")
    private int readTimeoutMs = 60000;

    @PostConstruct
    void configureTimeouts() {
        if (connectTimeoutMs <= 0 || readTimeoutMs <= 0) throw new IllegalArgumentException("Groq timeouts must be positive");
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        restTemplate.setRequestFactory(factory);
    }

    public AiResponseDto chatWithAi(AiChatRequest request, Long userId) {
        if (request.getPrompt() == null || request.getPrompt().isBlank() || request.getPrompt().length() > 4000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi phải có 1–4000 ký tự");
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(turn("system", SYSTEM));
        if (request.getConversationId() != null) {
            chatService.requireMember(request.getConversationId(), userId);
            messages.addAll(recentTurns(request.getConversationId(), null));
        }
        messages.add(turn("user", request.getPrompt().trim()));
        return answer(messages);
    }

    public AiResponseDto summarizeConversation(AiSummaryRequest request, Long userId) {
        chatService.requireMember(request.getConversationId(), userId);
        List<Message> recent = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                request.getConversationId(), PageRequest.of(0, 30)).getContent();
        List<String> lines = new ArrayList<>();
        int remaining = 6000;
        for (Message message : recent) {
            if (message.isDeleted() || message.getMessageType() != MessageType.TEXT ||
                    message.getContent() == null || message.getContent().isBlank()) continue;
            String name = message.getSender() == null ? "Thành viên" : message.getSender().getFullName();
            String line = (name == null ? "Thành viên" : name) + ": " + message.getContent().replace('\n', ' ');
            if (lines.isEmpty() && line.length() > remaining) line = line.substring(0, remaining);
            if (line.length() > remaining) break;
            lines.add(line);
            remaining -= line.length() + 1;
        }
        if (lines.isEmpty()) return AiResponseDto.builder()
                .response("Cuộc trò chuyện chưa có tin nhắn văn bản để tóm tắt.").model(model).build();
        Collections.reverse(lines);
        return answer(List.of(turn("system", SYSTEM),
                turn("user", "Tóm tắt ngắn gọn các ý chính của đoạn chat sau theo gạch đầu dòng, không tự bịa thông tin:\n\n"
                        + String.join("\n", lines))));
    }

    public String respondToMention(Long conversationId, Long actorId, Long triggeringMessageId, String question) {
        chatService.requireCanSend(conversationId, actorId);
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(turn("system", SYSTEM + " Bạn đang được nhắc bằng @AI trong đoạn chat. "
                + "Trả lời câu hỏi mới nhất, dùng lịch sử gần đây khi hữu ích, không tiết lộ nội dung ngoài đoạn chat."));
        messages.addAll(recentTurns(conversationId, triggeringMessageId));
        messages.add(turn("user", question.isBlank() ? "Hãy giúp tôi trong đoạn chat này." : question));
        return answer(messages).getResponse();
    }

    private List<Map<String, String>> recentTurns(Long conversationId, Long excludeId) {
        List<Message> recent = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, 16)).getContent();
        List<Map<String, String>> selected = new ArrayList<>();
        int remaining = 5000;
        for (Message message : recent) {
            if (Objects.equals(message.getId(), excludeId) || message.isDeleted()
                    || (message.getMessageType() != MessageType.TEXT && message.getMessageType() != MessageType.AI)
                    || message.getContent() == null || message.getContent().isBlank()) continue;
            String content = message.getContent();
            if (message.getMessageType() == MessageType.TEXT) {
                String name = message.getSender() == null ? "Thành viên" : message.getSender().getFullName();
                content = (name == null ? "Thành viên" : name) + ": " + content;
            }
            if (selected.isEmpty() && content.length() > remaining) content = content.substring(0, remaining);
            if (content.length() > remaining) break;
            selected.add(turn(message.getMessageType() == MessageType.AI ? "assistant" : "user", content));
            remaining -= content.length();
        }
        Collections.reverse(selected);
        return selected;
    }

    private static Map<String, String> turn(String role, String content) {
        return Map.of("role", role, "content", content);
    }

    private AiResponseDto answer(List<Map<String, String>> messages) {
        if (apiKey == null || apiKey.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình GROQ_API_KEY cho backend.");
        if (model == null || model.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình GROQ_MODEL.");
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());
            Map<String, Object> body = new HashMap<>();
            body.put("model", model.trim());
            body.put("messages", messages);
            body.put("max_completion_tokens", 2048);
            body.put("temperature", 0.5);
            if (model.trim().startsWith("openai/gpt-oss-")) {
                body.put("reasoning_effort", "low");
                body.put("include_reasoning", false);
            }
            ResponseEntity<String> response = restTemplate.postForEntity(
                    apiUrl.trim(), new HttpEntity<>(body, headers), String.class);
            JsonNode choice = mapper.readTree(response.getBody()).path("choices").path(0).path("message").path("content");
            String text = choice.asText("").trim();
            if (text.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Groq không trả về nội dung.");
            return AiResponseDto.builder().response(text).model(model).build();
        } catch (HttpStatusCodeException error) {
            int status = error.getStatusCode().value();
            String detail = "";
            try { detail = mapper.readTree(error.getResponseBodyAsString()).path("error").path("message").asText("").toLowerCase(Locale.ROOT); }
            catch (Exception ignored) { /* Unexpected provider error format */ }
            log.warn("Groq responded with HTTP {} (details omitted)", status);
            String reason = status == 429 ? "Groq đang giới hạn lượt gọi. Hãy thử lại sau."
                    : status == 401 || status == 403 ? "Groq API key không hợp lệ hoặc chưa được cấp quyền."
                    : status == 404 || (status == 400 && detail.contains("model")) ? "Không tìm thấy mô hình Groq. Kiểm tra GROQ_MODEL."
                    : status == 400 ? "Yêu cầu Groq không hợp lệ (400). Kiểm tra cấu hình mô hình."
                    : "Groq gặp lỗi HTTP " + status + ". Hãy thử lại.";
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, reason);
        } catch (ResourceAccessException error) {
            Throwable cause = error;
            String reason = "Backend Java không kết nối được Groq. Kiểm tra mạng/proxy.";
            while (cause != null) {
                if (cause instanceof SSLException) reason = "Java gặp lỗi TLS khi kết nối Groq.";
                else if (cause instanceof UnknownHostException) reason = "Java không phân giải được api.groq.com.";
                else if (cause instanceof SocketTimeoutException) reason = "Groq chưa phản hồi trong thời gian chờ. Hãy thử lại.";
                else if (cause instanceof ConnectException) reason = "Java không mở được kết nối tới Groq.";
                cause = cause.getCause();
            }
            log.warn("Groq transport error: {}", error.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, reason);
        } catch (ResponseStatusException error) {
            throw error;
        } catch (Exception error) {
            log.warn("Groq response parse failed: {}", error.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không đọc được phản hồi Groq.");
        }
    }
}
