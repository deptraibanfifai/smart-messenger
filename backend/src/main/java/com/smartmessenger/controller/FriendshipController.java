package com.smartmessenger.controller;

import com.smartmessenger.dto.FriendshipDto;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendshipController {
    private final FriendshipService friendships;

    @GetMapping
    public List<FriendshipDto> list(@AuthenticationPrincipal UserDetailsImpl me) {
        return friendships.list(me.getId());
    }

    @GetMapping("/{otherId}")
    public ResponseEntity<FriendshipDto> status(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        FriendshipDto relation = friendships.status(me.getId(), otherId);
        return relation == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(relation);
    }

    @PostMapping("/{otherId}")
    public FriendshipDto request(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        return friendships.request(me.getId(), otherId);
    }

    @PutMapping("/{otherId}/accept")
    public FriendshipDto accept(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        return friendships.accept(me.getId(), otherId);
    }

    @DeleteMapping("/{otherId}")
    public ResponseEntity<Void> remove(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        friendships.remove(me.getId(), otherId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{otherId}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        friendships.reject(me.getId(), otherId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{otherId}/block")
    public FriendshipDto block(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        return friendships.block(me.getId(), otherId);
    }

    @DeleteMapping("/{otherId}/block")
    public ResponseEntity<Void> unblock(@PathVariable Long otherId, @AuthenticationPrincipal UserDetailsImpl me) {
        friendships.unblock(me.getId(), otherId);
        return ResponseEntity.noContent().build();
    }
}
