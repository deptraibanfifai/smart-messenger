package com.smartmessenger.service;

import com.smartmessenger.model.*;
import com.smartmessenger.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {
    @Mock FriendshipRepository relationships;
    @Mock UserRepository users;
    @InjectMocks FriendshipService service;

    private User person(long id) {
        return User.builder().id(id).username("u" + id).fullName("User " + id)
                .status(UserStatus.ACTIVE).role(Role.ROLE_USER).build();
    }

    @Test
    void requestAlwaysStoresOrderedPair() {
        when(users.findById(7L)).thenReturn(Optional.of(person(7L)));
        when(users.findById(2L)).thenReturn(Optional.of(person(2L)));
        when(relationships.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.request(7L, 2L);
        assertEquals("PENDING", result.status());
        assertTrue(result.initiatedByMe());
        ArgumentCaptor<Friendship> saved = ArgumentCaptor.forClass(Friendship.class);
        verify(relationships).saveAndFlush(saved.capture());
        assertEquals(2L, saved.getValue().getUserLow().getId());
        assertEquals(7L, saved.getValue().getUserHigh().getId());
    }

    @Test
    void senderCannotAcceptOwnRequest() {
        var relation = Friendship.builder().userLow(person(2L)).userHigh(person(7L))
                .initiatedBy(person(7L)).status(FriendshipStatus.PENDING).build();
        when(relationships.findByUserLow_IdAndUserHigh_Id(2L, 7L)).thenReturn(Optional.of(relation));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.accept(7L, 2L));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(relationships, never()).save(any());
    }

    @Test
    void onlyAcceptedFriendsCanChat() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.requireFriends(7L, 2L));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        when(relationships.existsByUserLow_IdAndUserHigh_IdAndStatus(2L, 7L, FriendshipStatus.ACCEPTED))
                .thenReturn(true);
        assertDoesNotThrow(() -> service.requireFriends(7L, 2L));
    }
}
