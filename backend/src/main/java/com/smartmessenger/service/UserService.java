package com.smartmessenger.service;

import com.smartmessenger.dto.UserDto;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto updateProfile(String username, String fullName, String avatarUrl) {
        User user = userRepository.findByUsername(username).orElseThrow();
        if (fullName == null || fullName.isBlank() || fullName.trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên hiển thị phải có 1–100 ký tự");
        }
        if (avatarUrl != null && !avatarUrl.isBlank() &&
                (avatarUrl.length() > 500 || !avatarUrl.matches("(?i)^https://[^\\s]+$"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh đại diện phải là URL HTTPS hợp lệ");
        }
        user.setFullName(fullName.trim());
        user.setAvatarUrl(avatarUrl == null || avatarUrl.isBlank() ? null : avatarUrl.trim());
        return UserDto.fromEntity(userRepository.save(user), true);
    }

    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username).orElseThrow();
        if (oldPassword == null || !passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải có 8–72 ký tự");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public UserDto getCurrentUserDto(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        return UserDto.fromEntity(user, true);
    }

    public List<UserDto> searchUsers(String keyword, String currentUsername) {
        return userRepository.searchUsers(keyword).stream()
                .filter(u -> !u.getUsername().equalsIgnoreCase(currentUsername))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(u -> UserDto.fromEntity(u, presenceService.isUserOnline(u.getId())))
                .collect(Collectors.toList());
    }

    public List<UserDto> getAllActiveUsers(String currentUsername) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equalsIgnoreCase(currentUsername))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(u -> UserDto.fromEntity(u, presenceService.isUserOnline(u.getId())))
                .collect(Collectors.toList());
    }
}
