package com.smartmessenger.service;

import com.smartmessenger.dto.PresenceEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, SessionUser> sessions = new HashMap<>();
    private final Map<Long, Integer> sessionCounts = new HashMap<>();

    private record SessionUser(Long userId, String username) {}

    public synchronized void sessionConnected(String sessionId, Long userId, String username) {
        if (sessionId == null || sessions.containsKey(sessionId)) return;
        sessions.put(sessionId, new SessionUser(userId, username));
        if (sessionCounts.merge(userId, 1, Integer::sum) == 1)
            broadcastPresence(userId, username, true);
    }

    public synchronized void sessionDisconnected(String sessionId) {
        SessionUser session = sessions.remove(sessionId);
        if (session == null) return;
        int count = sessionCounts.getOrDefault(session.userId(), 0) - 1;
        if (count <= 0) {
            sessionCounts.remove(session.userId());
            broadcastPresence(session.userId(), session.username(), false);
        } else sessionCounts.put(session.userId(), count);
    }

    public synchronized boolean isUserOnline(Long userId) {
        return sessionCounts.containsKey(userId);
    }

    public synchronized long getOnlineCount() {
        return sessionCounts.size();
    }

    public synchronized Set<Long> getOnlineUserIds() {
        return Set.copyOf(sessionCounts.keySet());
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
