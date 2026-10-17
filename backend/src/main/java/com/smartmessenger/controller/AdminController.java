package com.smartmessenger.controller;

import com.smartmessenger.dto.AdminStatsDto;
import com.smartmessenger.dto.UserDto;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.service.AdminService;
import com.smartmessenger.security.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String statusStr = body.get("status");
        UserStatus status = UserStatus.valueOf(statusStr);
        return ResponseEntity.ok(adminService.updateUserStatus(userId, status, principal.getId()));
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long conversationId) {
        adminService.deleteConversation(conversationId);
        return ResponseEntity.ok().build();
    }
}
