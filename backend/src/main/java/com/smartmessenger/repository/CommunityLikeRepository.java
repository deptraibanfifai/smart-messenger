package com.smartmessenger.repository;

import com.smartmessenger.model.CommunityLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommunityLikeRepository extends JpaRepository<CommunityLike, Long> {
    long countByPost_Id(Long postId);
    boolean existsByPost_IdAndUser_Id(Long postId, Long userId);
    Optional<CommunityLike> findByPost_IdAndUser_Id(Long postId, Long userId);
    void deleteByPost_Id(Long postId);
}
