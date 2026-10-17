package com.smartmessenger.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiChatRequest {
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String prompt;
    private Long conversationId; // Optional: Nếu muốn lưu câu trả lời vào đoạn chat
}
