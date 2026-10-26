package com.smartmessenger.service;

import com.smartmessenger.dto.ChatMessageDto;
import com.smartmessenger.dto.ConversationDto;
import com.smartmessenger.dto.CreateGroupRequest;
import com.smartmessenger.dto.UserDto;
import com.smartmessenger.model.*;
import com.smartmessenger.repository.ConversationMemberRepository;
import com.smartmessenger.repository.ConversationRepository;
import com.smartmessenger.repository.MessageRepository;
import com.smartmessenger.repository.MessageReactionRepository;
import com.smartmessenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public void requireMember(Long conversationId, Long userId) {
        if (!memberRepository.existsByConversationIdAndUserId(conversationId, userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thuộc cuộc trò chuyện này");
    }

    private Conversation requireOwner(Long conversationId, Long userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (conv.getType() != ConversationType.GROUP || !memberRepository.findByConversationIdAndUserId(conversationId, userId)
                .map(m -> m.getRole() == MemberRole.OWNER).orElse(false))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ trưởng nhóm được quản lý nhóm");
        return conv;
    }

    @Transactional
    public ConversationDto renameGroup(Long id, Long actor, String title) {
        Conversation conv = requireOwner(id, actor);
        if (title == null || title.isBlank() || title.length() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhóm phải có 1–100 ký tự");
        conv.setTitle(title.trim());
        return mapToConversationDto(conversationRepository.save(conv), actor);
    }

    @Transactional
    public ConversationDto addMember(Long id, Long actor, Long memberId) {
        Conversation conv = requireOwner(id, actor);
        User user = userRepository.findById(memberId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (user.getStatus() != UserStatus.ACTIVE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if (!memberRepository.existsByConversationIdAndUserId(id, memberId))
            memberRepository.save(ConversationMember.builder().conversation(conv).user(user).role(MemberRole.MEMBER).build());
        return mapToConversationDto(conv, actor);
    }

    @Transactional
    public ConversationDto removeMember(Long id, Long actor, Long memberId) {
        Conversation conv = requireOwner(id, actor);
        if (actor.equals(memberId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy chuyển quyền trước khi rời nhóm");
        memberRepository.deleteByConversationIdAndUserId(id, memberId);
        return mapToConversationDto(conv, actor);
    }

    @Transactional
    public ConversationDto transferOwner(Long id, Long actor, Long memberId) {
        Conversation conv = requireOwner(id, actor);
        ConversationMember current = memberRepository.findByConversationIdAndUserId(id, actor).orElseThrow();
        ConversationMember next = memberRepository.findByConversationIdAndUserId(id, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người nhận chưa thuộc nhóm"));
        if (actor.equals(memberId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        current.setRole(MemberRole.MEMBER);
        next.setRole(MemberRole.OWNER);
        memberRepository.save(current);
        memberRepository.save(next);
        return mapToConversationDto(conv, actor);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(Long userId) {
        List<Conversation> conversations = conversationRepository.findAllByUserId(userId);
        return conversations.stream()
                .map(conv -> mapToConversationDto(conv, userId))
                .collect(Collectors.toList());
    }

    @Transactional
    public ConversationDto getOrCreateDirectConversation(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new IllegalArgumentException("Không thể tự tạo đoạn chat với chính mình");
        }
        if (!userRepository.findById(targetUserId).map(u -> u.getStatus() == UserStatus.ACTIVE).orElse(false))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản đích không khả dụng");

        return conversationRepository.findDirectConversation(currentUserId, targetUserId)
                .map(conv -> mapToConversationDto(conv, currentUserId))
                .orElseGet(() -> {
                    User currentUser = userRepository.findById(currentUserId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found: " + currentUserId));
                    User targetUser = userRepository.findById(targetUserId)
                            .orElseThrow(() -> new IllegalArgumentException("Target user not found: " + targetUserId));

                    Conversation conversation = Conversation.builder()
                            .type(ConversationType.DIRECT)
                            .createdBy(currentUser)
                            .themeColor("#0284c7")
                            .build();
                    conversation = conversationRepository.save(conversation);

                    ConversationMember m1 = ConversationMember.builder()
                            .conversation(conversation)
                            .user(currentUser)
                            .role(MemberRole.MEMBER)
                            .build();
                    ConversationMember m2 = ConversationMember.builder()
                            .conversation(conversation)
                            .user(targetUser)
                            .role(MemberRole.MEMBER)
                            .build();
                    memberRepository.save(m1);
                    memberRepository.save(m2);

                    return mapToConversationDto(conversation, currentUserId);
                });
    }

    @Transactional
    public ConversationDto createGroup(Long ownerId, CreateGroupRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + ownerId));

        Conversation conversation = Conversation.builder()
                .type(ConversationType.GROUP)
                .title(request.getTitle())
                .themeColor("#0284c7")
                .createdBy(owner)
                .build();
        conversation = conversationRepository.save(conversation);

        List<ConversationMember> members = new ArrayList<>();
        members.add(ConversationMember.builder()
                .conversation(conversation)
                .user(owner)
                .role(MemberRole.OWNER)
                .build());

        for (Long memberId : request.getMemberIds().stream().distinct().toList()) {
            if (!memberId.equals(ownerId)) {
                User user = userRepository.findById(memberId).orElse(null);
                if (user != null && user.getStatus() == UserStatus.ACTIVE) {
                    members.add(ConversationMember.builder()
                            .conversation(conversation)
                            .user(user)
                            .role(MemberRole.MEMBER)
                            .build());
                }
            }
        }
        memberRepository.saveAll(members);

        return mapToConversationDto(conversation, ownerId);
    }

    @Transactional
    public void updateConversationTheme(Long conversationId, Long actor, String themeColor) {
        requireMember(conversationId, actor);
        if (themeColor == null || !themeColor.matches("(?i)#[0-9a-f]{6}(,#[0-9a-f]{6})?")) {
            throw new IllegalArgumentException("Màu đoạn chat không hợp lệ");
        }
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));
        conversation.setThemeColor(themeColor);
        conversationRepository.save(conversation);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessageHistory(Long conversationId, Long actor, int page, int size) {
        requireMember(conversationId, actor);
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)))
        ).getContent().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDto saveAndBroadcastMessage(Long conversationId, Long senderId, String content, MessageType type) {
        return saveAndBroadcastMessage(conversationId, senderId, content, type, null);
    }

    @Transactional
    public ChatMessageDto saveAndBroadcastMessage(Long conversationId, Long senderId, String content, MessageType type, Long replyToId) {
        requireMember(conversationId, senderId);
        if (content == null || content.isBlank() || content.length() > 4000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung phải có 1–4000 ký tự");
        if (type != MessageType.TEXT && type != MessageType.IMAGE && type != MessageType.FILE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại tin nhắn không hợp lệ");
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        User sender = senderId != null ? userRepository.findById(senderId).orElse(null) : null;
        Message reply = null;
        if (replyToId != null) {
            reply = messageRepository.findById(replyToId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy tin nhắn được trả lời"));
            if (!reply.getConversation().getId().equals(conversationId) || reply.isDeleted())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể trả lời tin nhắn này");
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .messageType(type != null ? type : MessageType.TEXT)
                .replyTo(reply)
                .build();
        message = messageRepository.save(message);

        ChatMessageDto dto = toDto(message);

        // Broadcast to all subscribers of this conversation topic
        List<ConversationMember> recipients = memberRepository.findByConversationId(conversationId);
        afterCommit(() -> {
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, dto);
            for (ConversationMember member : recipients) {
                if (!member.getUser().getId().equals(senderId)) {
                    messagingTemplate.convertAndSendToUser(member.getUser().getUsername(), "/queue/chat-events", dto);
                }
            }
        });

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> searchMessages(Long id, Long actor, String keyword) {
        requireMember(id, actor);
        if (keyword == null || keyword.isBlank()) return List.of();
        return messageRepository.search(id, keyword.trim(), PageRequest.of(0, 50)).map(this::toDto).getContent();
    }

    @Transactional
    public ChatMessageDto editMessage(Long id, Long actor, String content) {
        Message msg = messageRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireMember(msg.getConversation().getId(), actor);
        if (msg.getSender() == null || !actor.equals(msg.getSender().getId()) || msg.isDeleted() || msg.getMessageType() != MessageType.TEXT)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (content == null || content.isBlank() || content.length() > 4000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        msg.setContent(content.trim());
        msg.setEditedAt(LocalDateTime.now());
        return broadcastUpdate(msg);
    }

    @Transactional
    public ChatMessageDto deleteMessage(Long id, Long actor) {
        Message msg = messageRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireMember(msg.getConversation().getId(), actor);
        if (msg.getSender() == null || !actor.equals(msg.getSender().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        msg.setDeleted(true);
        msg.setContent("Tin nhắn đã bị xóa");
        return broadcastUpdate(msg);
    }

    @Transactional
    public void markRead(Long id, Long actor) {
        ConversationMember member = memberRepository.findByConversationIdAndUserId(id, actor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        member.setLastReadAt(LocalDateTime.now());
        memberRepository.save(member);
        afterCommit(() -> messagingTemplate.convertAndSendToUser(member.getUser().getUsername(), "/queue/read", Map.of("conversationId", id)));
        if (member.getConversation().getType() == ConversationType.DIRECT) {
            for (Message msg : messageRepository.findByConversationIdAndSenderIdNotAndReadAtIsNull(id, actor)) {
                msg.setReadAt(LocalDateTime.now());
                broadcastUpdate(msg);
            }
        }
    }

    private static final Set<String> EMOJIS = Set.of("👍", "❤️", "😂", "😮", "😢");

    @Transactional
    public ChatMessageDto react(Long messageId, Long actor, String emoji) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireMember(message.getConversation().getId(), actor);
        if (message.isDeleted() || !EMOJIS.contains(emoji))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cảm xúc không hợp lệ");
        MessageReaction reaction = reactionRepository.findByMessageIdAndUserId(messageId, actor)
                .orElseGet(() -> MessageReaction.builder().message(message)
                        .user(userRepository.getReferenceById(actor)).build());
        reaction.setEmoji(emoji);
        reactionRepository.saveAndFlush(reaction);
        return broadcastUpdate(message);
    }

    @Transactional
    public ChatMessageDto removeReaction(Long messageId, Long actor) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireMember(message.getConversation().getId(), actor);
        reactionRepository.findByMessageIdAndUserId(messageId, actor).ifPresent(reactionRepository::delete);
        reactionRepository.flush();
        return broadcastUpdate(message);
    }

    private ChatMessageDto toDto(Message message) {
        ChatMessageDto dto = ChatMessageDto.fromEntity(message);
        Map<String, List<Long>> reactions = new LinkedHashMap<>();
        for (MessageReaction reaction : reactionRepository.findByMessageId(message.getId())) {
            reactions.computeIfAbsent(reaction.getEmoji(), ignored -> new ArrayList<>()).add(reaction.getUser().getId());
        }
        dto.setReactions(reactions);
        return dto;
    }

    private ChatMessageDto broadcastUpdate(Message msg) {
        ChatMessageDto dto = toDto(messageRepository.save(msg));
        afterCommit(() -> messagingTemplate.convertAndSend("/topic/conversation/" + msg.getConversation().getId(), dto));
        return dto;
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { action.run(); }
            });
        } else action.run();
    }

    public ConversationDto mapToConversationDto(Conversation conversation) {
        return mapToConversationDto(conversation, null);
    }

    public ConversationDto mapToConversationDto(Conversation conversation, Long viewerId) {
        List<UserDto> memberDtos = memberRepository.findByConversationId(conversation.getId()).stream()
                .map(m -> UserDto.fromEntity(m.getUser(), presenceService.isUserOnline(m.getUser().getId())))
                .collect(Collectors.toList());

        ChatMessageDto lastMessage = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversation.getId(), PageRequest.of(0, 1)
        ).getContent().stream().findFirst().map(this::toDto).orElse(null);

        ConversationDto dto = ConversationDto.fromEntity(conversation, memberDtos, lastMessage);
        dto.setOwnerId(memberRepository.findByConversationId(conversation.getId()).stream()
                .filter(m -> m.getRole() == MemberRole.OWNER).map(m -> m.getUser().getId()).findFirst().orElse(null));
        if (viewerId != null) {
            memberRepository.findByConversationIdAndUserId(conversation.getId(), viewerId)
                    .ifPresent(member -> dto.setUnreadCount(member.getLastReadAt() == null
                            ? messageRepository.countAllUnread(conversation.getId(), viewerId)
                            : messageRepository.countUnreadSince(conversation.getId(), viewerId, member.getLastReadAt())));
        }
        return dto;
    }
}
