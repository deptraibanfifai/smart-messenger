package com.smartmessenger.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiSummaryRequest {
    @NotNull(message = "conversationId không được để trống")
    private Long conversationId;
}
