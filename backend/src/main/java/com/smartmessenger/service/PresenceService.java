package com.smartmessenger.service;

import com.smartmessenger.dto.PresenceEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Set<Long> onlineUserIds = ConcurrentHashMap.newKeySet();

    public void userConnected(Long userId, String username) {
        onlineUserIds.add(userId);
        broadcastPresence(userId, username, true);
    }

    public void userDisconnected(Long userId, String username) {
        onlineUserIds.remove(userId);
        broadcastPresence(userId, username, false);
    }

    public boolean isUserOnline(Long userId) {
        return onlineUserIds.contains(userId);
    }

    public long getOnlineCount() {
        return onlineUserIds.size();
    }

    public Set<Long> getOnlineUserIds() {
        return onlineUserIds;
    }

    private void broadcastPresence(Long userId, String username, boolean online) {
        PresenceEventDto event = PresenceEventDto.builder()
                .userId(userId)
                .username(username)
                .online(online)
                .build();
        messagingTemplate.convertAndSend("/topic/presence", event);
    }
}
