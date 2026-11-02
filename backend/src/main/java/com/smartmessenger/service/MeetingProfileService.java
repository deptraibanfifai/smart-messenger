package com.smartmessenger.service;

import com.smartmessenger.dto.MeetingProfileDto;
import com.smartmessenger.dto.MeetingProfileRequest;
import com.smartmessenger.model.*;
import com.smartmessenger.repository.MeetingProfileRepository;
import com.smartmessenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MeetingProfileService {
    private final MeetingProfileRepository profiles;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public MeetingProfileDto mine(Long userId) {
        return profiles.findById(userId).map(MeetingProfileDto::from).orElseGet(() -> {
            User user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            return new MeetingProfileDto(user.getId(), user.getUsername(), user.getFullName(), user.getAvatarUrl(),
                    "", "", "", false);
        });
    }

    @Transactional
    public MeetingProfileDto update(Long userId, MeetingProfileRequest request) {
        if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu nội dung hồ sơ");
        String bio = clean(request.bio(), 300, "Giới thiệu");
        String interests = clean(request.interests(), 300, "Sở thích");
        String question = clean(request.openingQuestion(), 160, "Câu hỏi mở đầu");
        if (request.visible() && (bio.isBlank() || interests.isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy thêm giới thiệu và sở thích trước khi công khai");
        User user = users.findById(userId).filter(u -> u.getRole() == Role.ROLE_USER && u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        MeetingProfile profile = profiles.findById(userId)
                .orElseGet(() -> MeetingProfile.builder().user(user).build());
        profile.setBio(bio);
        profile.setInterests(interests);
        profile.setOpeningQuestion(question);
        profile.setVisible(request.visible());
        return MeetingProfileDto.from(profiles.save(profile));
    }

    @Transactional(readOnly = true)
    public Page<MeetingProfileDto> discover(Long viewer, String query, int page) {
        String search = query == null ? "" : query.trim();
        if (search.length() > 80) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Từ khóa quá dài");
        if (page < 0 || page > 10000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trang không hợp lệ");
        return profiles.discover(viewer, UserStatus.ACTIVE, Role.ROLE_USER, search,
                PageRequest.of(page, 12, org.springframework.data.domain.Sort.by("userId").descending()))
                .map(MeetingProfileDto::from);
    }

    private String clean(String value, int max, String field) {
        String result = value == null ? "" : value.trim();
        if (result.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " quá dài");
        return result;
    }
}
