package com.smartmessenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "Tên nhóm không được để trống")
    private String title;

    @NotEmpty(message = "Nhóm phải có ít nhất 1 thành viên")
    private List<Long> memberIds;
}
