package com.smartmessenger.controller;

import com.smartmessenger.dto.AiChatRequest;
import com.smartmessenger.dto.AiResponseDto;
import com.smartmessenger.dto.AiSummaryRequest;
import com.smartmessenger.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.smartmessenger.security.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<AiResponseDto> chatWithAi(@Valid @RequestBody AiChatRequest request,
                                                    @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(aiService.chatWithAi(request, principal.getId()));
    }

    @PostMapping("/summary")
    public ResponseEntity<AiResponseDto> summarizeConversation(@Valid @RequestBody AiSummaryRequest request,
                                                                @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(aiService.summarizeConversation(request, principal.getId()));
    }
}
