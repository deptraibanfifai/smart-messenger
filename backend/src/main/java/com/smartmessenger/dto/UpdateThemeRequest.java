package com.smartmessenger.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateThemeRequest {
    @NotBlank(message = "Mã màu không được để trống")
    private String themeColor;
}
