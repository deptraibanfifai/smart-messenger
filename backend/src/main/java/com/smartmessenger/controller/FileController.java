package com.smartmessenger.controller;

import com.smartmessenger.dto.ChatMessageDto;
import com.smartmessenger.model.MessageType;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    private final ChatService chatService;
    @Value("${app.upload-dir:uploads}") private String uploadDir;
    private static final Set<String> TYPES = Set.of("image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain");

    @PostMapping(value = "/{conversationId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatMessageDto upload(@PathVariable Long conversationId, @RequestParam("file") MultipartFile file,
                                 @AuthenticationPrincipal UserDetailsImpl principal) throws IOException {
        chatService.requireMember(conversationId, principal.getId());
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024 || !TYPES.contains(file.getContentType()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp phải là PNG/JPEG/WebP/PDF/TXT, tối đa 10 MB");
        String extension = switch (file.getContentType()) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> ".txt";
        };
        String id = UUID.randomUUID() + extension;
        Path folder = Path.of(uploadDir).toAbsolutePath().normalize().resolve(conversationId.toString());
        Files.createDirectories(folder);
        Path path = folder.resolve(id);
        try (var input = file.getInputStream()) { Files.copy(input, path, StandardCopyOption.REPLACE_EXISTING); }
        try {
            return chatService.saveAndBroadcastMessage(conversationId, principal.getId(),
                    "/api/files/" + conversationId + "/" + id,
                    file.getContentType().startsWith("image/") ? MessageType.IMAGE : MessageType.FILE);
        } catch (RuntimeException e) {
            Files.deleteIfExists(path);
            throw e;
        }
    }

    @GetMapping("/{conversationId}/{fileId}")
    public ResponseEntity<Resource> download(@PathVariable Long conversationId, @PathVariable String fileId,
                                              @AuthenticationPrincipal UserDetailsImpl principal) throws IOException {
        chatService.requireMember(conversationId, principal.getId());
        if (!fileId.matches("[0-9a-f-]{36}\\.(png|jpg|webp|pdf|txt)")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Path path = Path.of(uploadDir).toAbsolutePath().normalize().resolve(conversationId.toString()).resolve(fileId);
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        String mime = Files.probeContentType(path);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(mime == null ? "application/octet-stream" : mime))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileId + "\"")
                .body(new UrlResource(path.toUri()));
    }
}
