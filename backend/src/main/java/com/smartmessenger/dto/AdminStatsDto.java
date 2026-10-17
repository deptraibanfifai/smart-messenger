package com.smartmessenger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalUsers;
    private long activeUsers;
    private long bannedUsers;
    private long onlineUsers;
    private long totalConversations;
    private long directConversations;
    private long groupConversations;
    private long totalMessages;
}
