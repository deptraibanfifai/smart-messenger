package com.smartmessenger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmessenger.dto.AiChatRequest;
import com.smartmessenger.dto.AiResponseDto;
import com.smartmessenger.dto.AiSummaryRequest;
import com.smartmessenger.model.Message;
import com.smartmessenger.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.api-url}")
    private String apiUrl;

    private final MessageRepository messageRepository;
    private final ChatService chatService;
    private final RestTemplate restTemplate = createClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static RestTemplate createClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        return new RestTemplate(factory);
    }

    public AiResponseDto chatWithAi(AiChatRequest request, Long userId) {
        if (request.getPrompt().length() > 4000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi tối đa 4000 ký tự");
        if (request.getConversationId() != null) chatService.requireMember(request.getConversationId(), userId);
        String systemInstruction = "Bạn là Trợ lý AI thông minh tích hợp trong hệ thống Smart Messenger. Hãy trả lời ngắn gọn, thân thiện và hữu ích bằng tiếng Việt.";
        String prompt = systemInstruction + "\n\nNgười dùng: " + request.getPrompt();

        String responseText = callGeminiApi(prompt);
        return AiResponseDto.builder()
                .response(responseText)
                .model("Gemini 3.8 Flash")
                .build();
    }

    public AiResponseDto summarizeConversation(AiSummaryRequest request, Long userId) {
        chatService.requireMember(request.getConversationId(), userId);
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtDesc(request.getConversationId(),
                org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
        if (messages.isEmpty()) {
            return AiResponseDto.builder()
                    .response("Cuộc trò chuyện này chưa có tin nhắn nào để tóm tắt.")
                    .model("Gemini 3.8 Flash")
                    .build();
        }

        // Ghép lịch sử tin nhắn
        String history = messages.stream().filter(m -> !m.isDeleted() && m.getMessageType() == com.smartmessenger.model.MessageType.TEXT)
                .limit(50)
                .map(m -> (m.getSender() != null ? m.getSender().getFullName() : "Hệ thống") + ": " + m.getContent())
                .collect(Collectors.joining("\n"));
        if (history.length() > 12000) history = history.substring(0, 12000);

        String prompt = "Dưới đây là lịch sử cuộc trò chuyện trong phòng chat Smart Messenger:\n\n"
                + history
                + "\n\nHãy tóm tắt ngắn gọn các ý chính, quyết định hoặc nội dung quan trọng của cuộc trò chuyện trên dưới dạng gạch đầu dòng rõ ràng bằng tiếng Việt.";

        String responseText = callGeminiApi(prompt);
        return AiResponseDto.builder()
                .response(responseText)
                .model("Gemini 3.8 Flash")
                .build();
    }

    private String callGeminiApi(String prompt) {
        // Không trả lời giả khi thiếu cấu hình.
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("YOUR_GEMINI_API_KEY_HERE")) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini chưa được cấu hình trên máy chủ");
        }

        try {
            String url = apiUrl;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

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
                    return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                }
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini không trả về nội dung");
        } catch (HttpStatusCodeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    e.getStatusCode().value() == 429 ? "Gemini đang giới hạn yêu cầu" : "Gemini từ chối yêu cầu (" + e.getStatusCode().value() + ")");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Không kết nối được Gemini");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không đọc được phản hồi Gemini");
        }
    }
}
