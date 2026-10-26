package com.smartmessenger.controller;

import com.smartmessenger.dto.ConversationDto;
import com.smartmessenger.dto.CreateGroupRequest;
import com.smartmessenger.dto.UpdateThemeRequest;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getMyConversations(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(chatService.getUserConversations(userDetails.getId()));
    }

    @PostMapping("/direct/{targetUserId}")
    public ResponseEntity<ConversationDto> getOrCreateDirect(
            @PathVariable Long targetUserId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(chatService.getOrCreateDirectConversation(userDetails.getId(), targetUserId));
    }

    @PostMapping("/group")
    public ResponseEntity<ConversationDto> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(chatService.createGroup(userDetails.getId(), request));
    }

    @PutMapping("/{id}/theme")
    public ResponseEntity<Void> updateTheme(
            @PathVariable Long id,
            @Valid @RequestBody UpdateThemeRequest request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        chatService.updateConversationTheme(id, principal.getId(), request.getThemeColor());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/title")
    public ConversationDto rename(@PathVariable Long id, @RequestBody Map<String, String> body,
                                  @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.renameGroup(id, principal.getId(), body.get("title"));
    }

    @PutMapping("/{id}/members/{memberId}/nickname")
    public ConversationDto nickname(@PathVariable Long id, @PathVariable Long memberId,
                                    @RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.updateNickname(id, principal.getId(), memberId, body.get("nickname"));
    }

    @PostMapping("/{id}/members/{memberId}")
    public ConversationDto add(@PathVariable Long id, @PathVariable Long memberId,
                               @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.addMember(id, principal.getId(), memberId);
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ConversationDto remove(@PathVariable Long id, @PathVariable Long memberId,
                                  @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.removeMember(id, principal.getId(), memberId);
    }

    @PutMapping("/{id}/owner/{memberId}")
    public ConversationDto owner(@PathVariable Long id, @PathVariable Long memberId,
                                 @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.transferOwner(id, principal.getId(), memberId);
    }
}
