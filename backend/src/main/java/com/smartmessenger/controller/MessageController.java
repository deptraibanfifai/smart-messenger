package com.smartmessenger.controller;

import com.smartmessenger.dto.ChatMessageDto;
import com.smartmessenger.service.ChatService;
import com.smartmessenger.security.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<List<ChatMessageDto>> getMessages(
            @RequestParam Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(chatService.getMessageHistory(conversationId, principal.getId(), page, size));
    }

    @GetMapping("/search")
    public List<ChatMessageDto> search(@RequestParam Long conversationId, @RequestParam String keyword,
                                        @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.searchMessages(conversationId, principal.getId(), keyword);
    }

    @PutMapping("/{id}")
    public ChatMessageDto edit(@PathVariable Long id, @RequestBody Map<String, String> body,
                               @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.editMessage(id, principal.getId(), body.get("content"));
    }

    @DeleteMapping("/{id}")
    public ChatMessageDto delete(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.deleteMessage(id, principal.getId());
    }

    @PutMapping("/{id}/reaction")
    public ChatMessageDto react(@PathVariable Long id, @RequestBody Map<String, String> body,
                                @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.react(id, principal.getId(), body.get("emoji"));
    }

    @DeleteMapping("/{id}/reaction")
    public ChatMessageDto removeReaction(@PathVariable Long id,
                                         @AuthenticationPrincipal UserDetailsImpl principal) {
        return chatService.removeReaction(id, principal.getId());
    }

    @PutMapping("/read/{conversationId}")
    public ResponseEntity<Void> read(@PathVariable Long conversationId, @AuthenticationPrincipal UserDetailsImpl principal) {
        chatService.markRead(conversationId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
