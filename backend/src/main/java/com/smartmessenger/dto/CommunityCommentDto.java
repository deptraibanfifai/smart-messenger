package com.smartmessenger.dto;

import java.time.LocalDateTime;

public record CommunityCommentDto(Long id, Long authorId, String authorName, String avatarUrl,
                                  String content, LocalDateTime createdAt) {
}
