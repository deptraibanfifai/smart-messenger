package com.smartmessenger.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "pending_registrations")
@Getter @Setter
public class PendingRegistration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Column(nullable = false, length = 50)
    private String username;
    @Column(nullable = false, name = "password_hash")
    private String passwordHash;
    @Column(nullable = false, name = "full_name", length = 100)
    private String fullName;
    @Column(nullable = false, name = "code_hash")
    private String codeHash;
    @Column(nullable = false)
    private int attempts;
    @Column(nullable = false, name = "sent_at")
    private LocalDateTime sentAt;
    @Column(nullable = false, name = "expires_at")
    private LocalDateTime expiresAt;
}
