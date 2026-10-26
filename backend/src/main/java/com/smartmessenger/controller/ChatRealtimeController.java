package com.smartmessenger.controller;

import com.smartmessenger.dto.ChatMessageDto;
import com.smartmessenger.model.MessageType;
import com.smartmessenger.service.ChatService;
import com.smartmessenger.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import java.security.Principal;
import com.smartmessenger.repository.UserRepository;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Controller
@RequiredArgsConstructor
public class ChatRealtimeController {

    private final ChatService chatService;
    private final PresenceService presenceService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Nhận tin nhắn từ Client qua WebSocket: /app/chat.sendMessage
     * Lưu vào Database và Broadcast tới tất cả người trong room qua /topic/conversation/{id}
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> payload, Principal principal) {
        Long conversationId = Long.valueOf(payload.get("conversationId").toString());
        Long senderId = userRepository.findByUsername(principal.getName()).orElseThrow().getId();
        String content = (String) payload.get("content");
        String typeStr = (String) payload.getOrDefault("messageType", "TEXT");
        MessageType type = MessageType.valueOf(typeStr);

        Long replyToId = payload.get("replyToId") == null ? null : Long.valueOf(payload.get("replyToId").toString());

        chatService.saveAndBroadcastMessage(conversationId, senderId, content, type, replyToId);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Map<String, Object> payload, Principal principal) {
        Long conversationId = Long.valueOf(payload.get("conversationId").toString());
        var user = userRepository.findByUsername(principal.getName()).orElseThrow();
        chatService.requireMember(conversationId, user.getId());
        messagingTemplate.convertAndSend("/topic/typing/" + conversationId,
                Map.of("conversationId", conversationId, "userId", user.getId(), "name", user.getFullName() == null ? user.getUsername() : user.getFullName(),
                        "typing", Boolean.TRUE.equals(payload.get("typing"))));
    }

    /**
     * Bắt sự kiện User kết nối WebSocket
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        if (event.getUser() == null || headerAccessor.getSessionId() == null) return;
        var user = userRepository.findByUsername(event.getUser().getName()).orElseThrow();
        presenceService.sessionConnected(headerAccessor.getSessionId(), user.getId(), user.getUsername());
    }

    /**
     * Bắt sự kiện User ngắt kết nối WebSocket
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        presenceService.sessionDisconnected(event.getSessionId());
    }

}
