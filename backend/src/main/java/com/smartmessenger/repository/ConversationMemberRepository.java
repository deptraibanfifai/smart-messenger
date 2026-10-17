package com.smartmessenger.repository;

import com.smartmessenger.model.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {
    List<ConversationMember> findByConversationId(Long conversationId);
    Optional<ConversationMember> findByConversationIdAndUserId(Long conversationId, Long userId);
    Boolean existsByConversationIdAndUserId(Long conversationId, Long userId);
    void deleteByConversationIdAndUserId(Long conversationId, Long userId);
}
