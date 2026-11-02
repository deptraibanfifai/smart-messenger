package com.smartmessenger.controller;

import com.smartmessenger.dto.CommunityCommentDto;
import com.smartmessenger.dto.CommunityPostDto;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community/posts")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService community;

    @GetMapping
    public List<CommunityPostDto> feed(@AuthenticationPrincipal UserDetailsImpl me,
                                       @RequestParam(defaultValue = "0") int page) {
        return community.feed(me.getId(), page);
    }

    @PostMapping
    public CommunityPostDto create(@AuthenticationPrincipal UserDetailsImpl me,
                                   @RequestBody Map<String, String> body) {
        return community.create(me.getId(), body.get("content"));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetailsImpl me, @PathVariable Long postId) {
        community.delete(me.getId(), postId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{postId}/like")
    public CommunityPostDto like(@AuthenticationPrincipal UserDetailsImpl me, @PathVariable Long postId) {
        return community.like(me.getId(), postId);
    }

    @DeleteMapping("/{postId}/like")
    public CommunityPostDto unlike(@AuthenticationPrincipal UserDetailsImpl me, @PathVariable Long postId) {
        return community.unlike(me.getId(), postId);
    }

    @GetMapping("/{postId}/comments")
    public List<CommunityCommentDto> comments(@AuthenticationPrincipal UserDetailsImpl me, @PathVariable Long postId,
                                               @RequestParam(defaultValue = "0") int page) {
        return community.listComments(me.getId(), postId, page);
    }

    @PostMapping("/{postId}/comments")
    public CommunityCommentDto comment(@AuthenticationPrincipal UserDetailsImpl me, @PathVariable Long postId,
                                        @RequestBody Map<String, String> body) {
        return community.comment(me.getId(), postId, body.get("content"));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@AuthenticationPrincipal UserDetailsImpl me,
                                               @PathVariable Long postId, @PathVariable Long commentId) {
        community.deleteComment(me.getId(), postId, commentId);
        return ResponseEntity.noContent().build();
    }
}
