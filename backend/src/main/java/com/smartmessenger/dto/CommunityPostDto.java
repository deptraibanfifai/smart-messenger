package com.smartmessenger.dto;

import java.time.LocalDateTime;

public record CommunityPostDto(Long id, Long authorId, String authorName, String username,
                               String avatarUrl, String content, LocalDateTime createdAt,
                               long likes, long comments, boolean likedByMe) {
}
