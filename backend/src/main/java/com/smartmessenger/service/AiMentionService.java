package com.smartmessenger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiMentionService {
    private static final Pattern MENTION = Pattern.compile("(?i)(?<![\\p{L}\\p{N}_])@ai\\b");
    private final AiService aiService;
    private final ChatService chatService;

    public static boolean hasMention(String content) {
        return content != null && MENTION.matcher(content).find();
    }

    @Async("aiExecutor")
    @EventListener
    public void onMention(AiMentionRequested request) {
        String question = MENTION.matcher(request.content()).replaceAll("").trim();
        try {
            String answer = aiService.respondToMention(request.conversationId(), request.senderId(),
                    request.messageId(), question);
            chatService.saveAiReply(request.conversationId(), request.messageId(), answer);
        } catch (ResponseStatusException error) {
            if (error.getStatusCode().value() == 403 || error.getStatusCode().value() == 404) return;
            saveError(request, error.getReason() == null ? "AI chưa trả lời được. Hãy thử lại." : error.getReason());
        } catch (Exception error) {
            log.warn("AI mention failed for conversation {}: {}", request.conversationId(),
                    error.getClass().getSimpleName());
            saveError(request, "AI đang gặp lỗi. Hãy thử lại sau.");
        }
    }

    private void saveError(AiMentionRequested request, String reason) {
        try {
            chatService.saveAiReply(request.conversationId(), request.messageId(), "⚠️ " + reason);
        } catch (Exception error) {
            log.warn("Unable to save AI response for conversation {}: {}", request.conversationId(),
                    error.getClass().getSimpleName());
        }
    }
}
