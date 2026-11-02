package com.smartmessenger.service;

import com.smartmessenger.model.*;
import com.smartmessenger.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {
    @Mock CommunityPostRepository posts;
    @Mock CommunityCommentRepository comments;
    @Mock CommunityLikeRepository likes;
    @Mock FriendshipRepository friendships;
    @Mock UserRepository users;
    @InjectMocks CommunityService service;

    private User person(long id) {
        return User.builder().id(id).username("u" + id).fullName("Người dùng " + id)
                .role(Role.ROLE_USER).status(UserStatus.ACTIVE).build();
    }

    @Test
    void createsPostWithAuthenticatedAuthorAndTrimmedContent() {
        when(users.findById(1L)).thenReturn(Optional.of(person(1L)));
        when(posts.saveAndFlush(any())).thenAnswer(call -> {
            CommunityPost saved = call.getArgument(0);
            saved.setId(10L);
            return saved;
        });
        var result = service.create(1L, "  Chào cộng đồng  ");
        assertEquals("Chào cộng đồng", result.content());
        assertEquals(1L, result.authorId());
        verify(posts).saveAndFlush(argThat(post -> post.getAuthor().getId().equals(1L)));
    }

    @Test
    void rejectsEmptyPostBeforeWriting() {
        when(users.findById(1L)).thenReturn(Optional.of(person(1L)));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.create(1L, "  "));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(posts);
    }

    @Test
    void blockedMembersCannotCommentOnEachOthersPosts() {
        when(users.findById(1L)).thenReturn(Optional.of(person(1L)));
        when(posts.findById(7L)).thenReturn(Optional.of(CommunityPost.builder().id(7L)
                .author(person(2L)).content("Hello").build()));
        when(friendships.existsByUserLow_IdAndUserHigh_IdAndStatus(1L, 2L, FriendshipStatus.BLOCKED))
                .thenReturn(true);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.comment(1L, 7L, "Chào"));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(comments);
    }

    @Test
    void onlyAuthorCanDeletePost() {
        when(posts.findById(7L)).thenReturn(Optional.of(CommunityPost.builder().id(7L)
                .author(person(2L)).build()));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.delete(1L, 7L));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(posts, never()).delete(any());
    }
}
