package com.smartmessenger.dto;

import com.smartmessenger.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String role;
    private String status;
    private boolean online;
    private String statusText;
    private java.time.Instant statusExpiresAt;

    public static UserDto fromEntity(User user, boolean online) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .online(online)
                .statusText(user.getStatusExpiresAt() != null && user.getStatusExpiresAt().isAfter(java.time.LocalDateTime.now())
                        ? user.getStatusText() : null)
                .statusExpiresAt(user.getStatusExpiresAt() == null ? null : user.getStatusExpiresAt().atZone(java.time.ZoneId.systemDefault()).toInstant())
                .build();
    }
}
