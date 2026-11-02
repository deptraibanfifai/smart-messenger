package com.smartmessenger.dto;

import com.smartmessenger.model.Friendship;
import com.smartmessenger.model.User;

public record FriendshipDto(Long userId, String username, String fullName, String avatarUrl,
                            String status, boolean initiatedByMe) {
    public static FriendshipDto from(Friendship relation, Long viewerId) {
        User other = relation.getUserLow().getId().equals(viewerId)
                ? relation.getUserHigh() : relation.getUserLow();
        return new FriendshipDto(other.getId(), other.getUsername(), other.getFullName(),
                other.getAvatarUrl(), relation.getStatus().name(),
                relation.getInitiatedBy().getId().equals(viewerId));
    }
}
