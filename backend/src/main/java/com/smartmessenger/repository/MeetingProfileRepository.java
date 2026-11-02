package com.smartmessenger.repository;

import com.smartmessenger.model.MeetingProfile;
import com.smartmessenger.model.Role;
import com.smartmessenger.model.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MeetingProfileRepository extends JpaRepository<MeetingProfile, Long> {
    @Query("SELECT p FROM MeetingProfile p JOIN p.user u WHERE p.visible = true " +
            "AND u.status = :status AND u.role = :role AND u.id <> :viewer " +
            "AND (:query = '' OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(p.interests) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND NOT EXISTS (SELECT f.id FROM Friendship f WHERE " +
            "((f.userLow.id = :viewer AND f.userHigh.id = u.id) " +
            "OR (f.userHigh.id = :viewer AND f.userLow.id = u.id)) AND f.status = com.smartmessenger.model.FriendshipStatus.BLOCKED)")
    Page<MeetingProfile> discover(@Param("viewer") Long viewer, @Param("status") UserStatus status,
                                  @Param("role") Role role, @Param("query") String query, Pageable pageable);
}
