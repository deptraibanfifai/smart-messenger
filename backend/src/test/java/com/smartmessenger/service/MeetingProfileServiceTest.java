package com.smartmessenger.service;

import com.smartmessenger.dto.MeetingProfileRequest;
import com.smartmessenger.model.MeetingProfile;
import com.smartmessenger.model.Role;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.MeetingProfileRepository;
import com.smartmessenger.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingProfileServiceTest {
    @Mock MeetingProfileRepository profiles;
    @Mock UserRepository users;
    @InjectMocks MeetingProfileService service;

    private User member() {
        return User.builder().id(3L).username("member").fullName("Member")
                .role(Role.ROLE_USER).status(UserStatus.ACTIVE).build();
    }

    @Test
    void newProfileStaysPrivateUntilOwnerEnablesIt() {
        when(users.findById(3L)).thenReturn(Optional.of(member()));
        when(profiles.save(any(MeetingProfile.class))).thenAnswer(call -> call.getArgument(0));
        var result = service.update(3L, new MeetingProfileRequest("  Tôi thích đọc sách  ", "Sách, cà phê", "", false));
        assertFalse(result.visible());
        assertEquals("Tôi thích đọc sách", result.bio());
        assertEquals("Sách, cà phê", result.interests());
    }

    @Test
    void cannotPublishEmptyProfile() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.update(3L, new MeetingProfileRequest("", "", "", true)));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(users, profiles);
    }

    @Test
    void discoveryExcludesUnpublishedProfilesAtRepositoryBoundary() {
        when(profiles.discover(eq(3L), eq(UserStatus.ACTIVE), eq(Role.ROLE_USER), eq("cà phê"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        assertTrue(service.discover(3L, " cà phê ", 0).isEmpty());
        verify(profiles).discover(eq(3L), eq(UserStatus.ACTIVE), eq(Role.ROLE_USER), eq("cà phê"), any(Pageable.class));
    }
}
