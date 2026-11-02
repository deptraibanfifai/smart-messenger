package com.smartmessenger.repository;

import com.smartmessenger.model.CommunityComment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {
    List<CommunityComment> findByPost_IdOrderByCreatedAtDescIdDesc(Long postId, Pageable page);
    long countByPost_Id(Long postId);
    void deleteByPost_Id(Long postId);
}
