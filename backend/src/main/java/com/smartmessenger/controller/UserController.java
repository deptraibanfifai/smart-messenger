package com.smartmessenger.controller;

import com.smartmessenger.dto.UserDto;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.PresenceService;
import com.smartmessenger.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/notes")
    public List<UserDto> notes() {
        return userService.getNotes();
    }

    @PutMapping("/me/note")
    public UserDto updateNote(@AuthenticationPrincipal UserDetailsImpl principal, @RequestBody Map<String, String> body) {
        UserDto updated = userService.updateNote(principal.getUsername(), body.get("text"));
        messagingTemplate.convertAndSend("/topic/profiles", updated);
        return updated;
    }

    @DeleteMapping("/me/note")
    public UserDto deleteNote(@AuthenticationPrincipal UserDetailsImpl principal) {
        return updateNote(principal, Map.of("text", ""));
    }

    @GetMapping("/online")
    public ResponseEntity<Set<Long>> online() {
        return ResponseEntity.ok(presenceService.getOnlineUserIds());
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(userService.getCurrentUserDto(userDetails.getUsername()));
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal UserDetailsImpl principal,
                            @RequestBody Map<String, String> body) {
        UserDto updated = userService.updateProfile(principal.getUsername(), body.get("fullName"), null);
        messagingTemplate.convertAndSend("/topic/profiles", updated);
        return updated;
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
