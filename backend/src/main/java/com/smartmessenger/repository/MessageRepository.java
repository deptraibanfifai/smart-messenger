package com.smartmessenger.repository;

import com.smartmessenger.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    List<Message> findAllByConversationIdAsc(@Param("conversationId") Long conversationId);

    long count();

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId AND m.deleted = false AND LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY m.createdAt DESC")
    Page<Message> search(@Param("conversationId") Long conversationId, @Param("keyword") String keyword, Pageable pageable);

    List<Message> findByConversationIdAndSenderIdNotAndReadAtIsNull(Long conversationId, Long senderId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId AND m.sender.id <> :userId AND m.deleted = false")
    long countAllUnread(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId AND m.sender.id <> :userId AND m.deleted = false AND m.createdAt > :since")
    long countUnreadSince(@Param("conversationId") Long conversationId, @Param("userId") Long userId, @Param("since") LocalDateTime since);
}
