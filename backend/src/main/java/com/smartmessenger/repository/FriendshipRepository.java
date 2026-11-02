package com.smartmessenger.repository;

import com.smartmessenger.model.Friendship;
import com.smartmessenger.model.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    Optional<Friendship> findByUserLow_IdAndUserHigh_Id(Long low, Long high);
    List<Friendship> findByUserLow_IdOrUserHigh_Id(Long low, Long high);
    boolean existsByUserLow_IdAndUserHigh_IdAndStatus(Long low, Long high, FriendshipStatus status);
}
