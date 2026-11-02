package com.smartmessenger.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meeting_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeetingProfile {
    @Id
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 300)
    private String bio;

    @Column(length = 300)
    private String interests;

    @Column(name = "opening_question", length = 160)
    private String openingQuestion;

    @Column(name = "is_visible", nullable = false)
    @Builder.Default
    private boolean visible = false;
}
