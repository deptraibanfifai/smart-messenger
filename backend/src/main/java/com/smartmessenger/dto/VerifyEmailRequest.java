package com.smartmessenger.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerifyEmailRequest {
    @NotBlank @Email
    private String email;
    @NotBlank @Pattern(regexp = "[0-9]{6}", message = "Mã xác minh gồm 6 chữ số")
    private String code;
}
