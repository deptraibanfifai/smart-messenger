package com.smartmessenger.service;

import com.smartmessenger.model.*;
import com.smartmessenger.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {
    @Mock ConversationRepository conversations;
    @Mock ConversationMemberRepository members;
    @Mock MessageRepository messages;
    @Mock MessageReactionRepository reactions;
    @Mock UserRepository users;
    @Mock PresenceService presence;
    @Mock SimpMessagingTemplate broker;
    @InjectMocks ChatService service;

    private Conversation conversation;
    private User sender;

    @BeforeEach
    void setUp() {
        conversation = Conversation.builder().id(10L).type(ConversationType.DIRECT).build();
        sender = User.builder().id(1L).username("alice").fullName("Alice").build();
    }

    @Test
    void rejectsReplyToAnotherConversationBeforeSaving() {
        when(members.existsByConversationIdAndUserId(10L, 1L)).thenReturn(true);
        when(conversations.findById(10L)).thenReturn(Optional.of(conversation));
        when(users.findById(1L)).thenReturn(Optional.of(sender));
        when(messages.findById(99L)).thenReturn(Optional.of(Message.builder().id(99L)
                .conversation(Conversation.builder().id(11L).build()).build()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.saveAndBroadcastMessage(10L, 1L, "Trả lời", MessageType.TEXT, 99L));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(messages, never()).save(any());
        verifyNoInteractions(broker);
    }

    @Test
    void rejectsReactionFromNonMember() {
        when(messages.findById(20L)).thenReturn(Optional.of(Message.builder().id(20L).conversation(conversation).build()));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.react(20L, 1L, "👍"));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(reactions, broker);
    }

    @Test
    void unreadCountUsesMembersOwnReadTime() {
        LocalDateTime readAt = LocalDateTime.of(2026, 10, 22, 8, 0);
        when(members.findByConversationId(10L)).thenReturn(List.of(ConversationMember.builder()
                .user(sender).role(MemberRole.MEMBER).build()));
        when(members.findByConversationIdAndUserId(10L, 1L)).thenReturn(Optional.of(
                ConversationMember.builder().user(sender).lastReadAt(readAt).build()));
        when(messages.countUnreadSince(10L, 1L, readAt)).thenReturn(3L);
        when(messages.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        assertEquals(3L, service.mapToConversationDto(conversation, 1L).getUnreadCount());
        verify(messages).countUnreadSince(10L, 1L, readAt);
    }
}
