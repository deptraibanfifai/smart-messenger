package com.smartmessenger.controller;

import com.smartmessenger.dto.UserDto;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(userService.getCurrentUserDto(userDetails.getUsername()));
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal UserDetailsImpl principal,
                            @RequestBody Map<String, String> body) {
        return userService.updateProfile(principal.getUsername(), body.get("fullName"), body.get("avatarUrl"));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UserDetailsImpl principal,
                                                @RequestBody Map<String, String> body) {
        userService.changePassword(principal.getUsername(), body.get("oldPassword"), body.get("newPassword"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (keyword.isBlank()) {
            return ResponseEntity.ok(userService.getAllActiveUsers(userDetails.getUsername()));
        }
        return ResponseEntity.ok(userService.searchUsers(keyword, userDetails.getUsername()));
    }
}
