package com.smartmessenger.controller;

import com.smartmessenger.dto.UserDto;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.AvatarStorageService;
import com.smartmessenger.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class AvatarController {
    private final AvatarStorageService storage;
    private final UserService users;
    private final SimpMessagingTemplate broker;

    @PostMapping(value = "/api/users/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto upload(@RequestParam("file") MultipartFile file,
                          @AuthenticationPrincipal UserDetailsImpl principal) throws IOException {
        String id = storage.store(file);
        UserDto updated;
        try { updated = users.updateAvatar(principal.getUsername(), "/api/avatars/" + id); }
        catch (RuntimeException e) { Files.deleteIfExists(storage.resolve(id)); throw e; }
        broker.convertAndSend("/topic/profiles", updated);
        return updated;
    }

    // Profile thumbnails are visible to other clients' <img> elements without a bearer header.
    @GetMapping("/api/avatars/{id}")
    public ResponseEntity<Resource> read(@PathVariable String id) throws IOException {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(new UrlResource(storage.resolve(id).toUri()));
    }
}
