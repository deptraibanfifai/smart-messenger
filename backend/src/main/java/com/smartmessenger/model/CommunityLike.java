package com.smartmessenger.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "community_likes", uniqueConstraints = @UniqueConstraint(name = "uq_community_like",
        columnNames = {"post_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommunityLike {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
