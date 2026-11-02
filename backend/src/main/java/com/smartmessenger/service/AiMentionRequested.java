package com.smartmessenger.service;

public record AiMentionRequested(Long conversationId, Long senderId, Long messageId, String content) {
}
