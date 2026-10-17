package com.smartmessenger.dto;

import com.smartmessenger.model.Message;
import com.smartmessenger.model.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private MessageType messageType;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private LocalDateTime readAt;
    private boolean deleted;

    public static ChatMessageDto fromEntity(Message message) {
        return ChatMessageDto.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender() != null ? message.getSender().getId() : null)
                .senderName(message.getSender() != null ? message.getSender().getFullName() : "Hệ thống / AI")
                .senderAvatar(message.getSender() != null ? message.getSender().getAvatarUrl() : "https://api.dicebear.com/7.x/bottts/svg?seed=ai")
                .content(message.getContent())
                .messageType(message.getMessageType())
                .createdAt(message.getCreatedAt())
                .editedAt(message.getEditedAt())
                .readAt(message.getReadAt())
                .deleted(message.isDeleted())
                .build();
    }
}
