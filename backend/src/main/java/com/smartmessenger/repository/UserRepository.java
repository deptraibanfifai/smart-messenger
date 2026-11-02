package com.smartmessenger.repository;

import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import com.smartmessenger.model.Role;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleSub(String googleSub);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND u.status = 'ACTIVE'")
    List<User> searchUsers(@Param("keyword") String keyword);
    List<User> findByStatusAndRoleAndIdNotOrderByCreatedAtDesc(UserStatus status, Role role, Long id, Pageable page);

    long countByStatus(UserStatus status);
}
