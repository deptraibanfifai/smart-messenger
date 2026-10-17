package com.smartmessenger.dto;

import com.smartmessenger.model.Conversation;
import com.smartmessenger.model.ConversationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDto {
    private Long id;
    private ConversationType type;
    private String title;
    private String themeColor;
    private Long createdBy;
    private Long ownerId;
    private List<UserDto> members;
    private ChatMessageDto lastMessage;
    private LocalDateTime createdAt;

    public static ConversationDto fromEntity(Conversation conv, List<UserDto> members, ChatMessageDto lastMessage) {
        return ConversationDto.builder()
                .id(conv.getId())
                .type(conv.getType())
                .title(conv.getTitle())
                .themeColor(conv.getThemeColor())
                .createdBy(conv.getCreatedBy() != null ? conv.getCreatedBy().getId() : null)
                .members(members)
                .lastMessage(lastMessage)
                .createdAt(conv.getCreatedAt())
                .build();
    }
}
