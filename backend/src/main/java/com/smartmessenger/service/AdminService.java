package com.smartmessenger.service;

import com.smartmessenger.dto.AdminStatsDto;
import com.smartmessenger.dto.UserDto;
import com.smartmessenger.model.ConversationType;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.ConversationRepository;
import com.smartmessenger.repository.MessageRepository;
import com.smartmessenger.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final PresenceService presenceService;

    public AdminStatsDto getSystemStats() {
        return AdminStatsDto.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByStatus(UserStatus.ACTIVE))
                .bannedUsers(userRepository.countByStatus(UserStatus.BANNED))
                .onlineUsers(presenceService.getOnlineCount())
                .totalConversations(conversationRepository.count())
                .directConversations(conversationRepository.countByType(ConversationType.DIRECT))
                .groupConversations(conversationRepository.countByType(ConversationType.GROUP))
                .totalMessages(messageRepository.count())
                .build();
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> UserDto.fromEntity(u, presenceService.isUserOnline(u.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateUserStatus(Long userId, UserStatus status, Long actorId) {
        if (userId.equals(actorId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tự khóa tài khoản quản trị");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setStatus(status);
        user = userRepository.save(user);
        return UserDto.fromEntity(user, presenceService.isUserOnline(userId));
    }

    @Transactional
    public void deleteConversation(Long conversationId) {
        conversationRepository.deleteById(conversationId);
    }
}
