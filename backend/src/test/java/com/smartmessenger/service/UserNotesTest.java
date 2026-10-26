package com.smartmessenger.service;

import com.smartmessenger.model.User;
import com.smartmessenger.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class UserNotesTest {
    final UserRepository users = mock(UserRepository.class);
    final PresenceService presence = mock(PresenceService.class);
    final UserService service = new UserService(users, presence, mock(PasswordEncoder.class));

    @Test
    void noteExpiresAfter24HoursAndCanBeCleared() {
        User user = User.builder().id(1L).username("alice").fullName("Alice").build();
        when(users.findByUsername("alice")).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
        LocalDateTime before = LocalDateTime.now();
        assertEquals("Xin chào", service.updateNote("alice", " Xin chào ").getStatusText());
        assertTrue(user.getStatusExpiresAt().isAfter(before.plusHours(23)));
        assertTrue(user.getStatusExpiresAt().isBefore(before.plusHours(25)));
        service.updateNote("alice", "");
        assertNull(user.getStatusText()); assertNull(user.getStatusExpiresAt());
    }

    @Test
    void hidesExpiredNotesAndRejectsOversizedText() {
        User user = User.builder().id(1L).username("alice").fullName("Alice")
                .statusText("Old note").statusExpiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(users.findAll()).thenReturn(List.of(user));
        assertTrue(service.getNotes().isEmpty());
        assertThrows(ResponseStatusException.class, () -> service.updateNote("alice", "a".repeat(81)));
        verify(users, never()).save(any());
    }
}
