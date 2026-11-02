package com.smartmessenger.controller;

import com.smartmessenger.dto.MeetingProfileDto;
import com.smartmessenger.dto.MeetingProfileRequest;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.MeetingProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/meeting")
@RequiredArgsConstructor
public class MeetingProfileController {
    private final MeetingProfileService service;

    @GetMapping("/me")
    public MeetingProfileDto mine(@AuthenticationPrincipal UserDetailsImpl me) {
        return service.mine(me.getId());
    }

    @PutMapping("/me")
    public MeetingProfileDto update(@AuthenticationPrincipal UserDetailsImpl me, @RequestBody MeetingProfileRequest request) {
        return service.update(me.getId(), request);
    }

    @GetMapping("/discover")
    public Page<MeetingProfileDto> discover(@AuthenticationPrincipal UserDetailsImpl me,
                                             @RequestParam(defaultValue = "") String query,
                                             @RequestParam(defaultValue = "0") int page) {
        return service.discover(me.getId(), query, page);
    }
}
