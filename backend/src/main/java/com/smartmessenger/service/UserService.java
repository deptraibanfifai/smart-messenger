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
        user.setFullName(fullName.trim());
        // Avatar is updated only by the dedicated local-file upload endpoint.
        return UserDto.fromEntity(userRepository.save(user), true);
    }

    @Transactional
    public UserDto updateAvatar(String username, String avatarUrl) {
        User user = userRepository.findByUsername(username).orElseThrow();
        user.setAvatarUrl(avatarUrl);
        return UserDto.fromEntity(userRepository.save(user), presenceService.isUserOnline(user.getId()));
    }

    @Transactional
    public UserDto updateNote(String username, String text) {
        String note = text == null ? "" : text.trim();
        if (note.length() > 80) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái tối đa 80 ký tự");
        User user = userRepository.findByUsername(username).orElseThrow();
        user.setStatusText(note.isEmpty() ? null : note);
        user.setStatusExpiresAt(note.isEmpty() ? null : java.time.LocalDateTime.now().plusHours(24));
        return UserDto.fromEntity(userRepository.save(user), presenceService.isUserOnline(user.getId()));
    }

    public List<UserDto> getNotes() {
        var now = java.time.LocalDateTime.now();
        return userRepository.findAll().stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE && u.getStatusText() != null
                        && u.getStatusExpiresAt() != null && u.getStatusExpiresAt().isAfter(now))
                .map(u -> UserDto.fromEntity(u, presenceService.isUserOnline(u.getId())))
                .collect(Collectors.toList());
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
