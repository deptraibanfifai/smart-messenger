package com.smartmessenger.dto;

import com.smartmessenger.model.MeetingProfile;

public record MeetingProfileDto(Long id, String username, String fullName, String avatarUrl,
                                String bio, String interests, String openingQuestion, boolean visible) {
    public static MeetingProfileDto from(MeetingProfile profile) {
        var user = profile.getUser();
        return new MeetingProfileDto(user.getId(), user.getUsername(), user.getFullName(), user.getAvatarUrl(),
                profile.getBio(), profile.getInterests(), profile.getOpeningQuestion(), profile.isVisible());
    }
}
