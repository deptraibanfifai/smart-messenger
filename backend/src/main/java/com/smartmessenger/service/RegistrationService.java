package com.smartmessenger.service;

import com.smartmessenger.dto.RegisterRequest;
import com.smartmessenger.dto.VerifyEmailRequest;
import com.smartmessenger.model.PendingRegistration;
import com.smartmessenger.model.Role;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.PendingRegistrationRepository;
import com.smartmessenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class RegistrationService {
    private final PendingRegistrationRepository pendingRepository;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Transactional
    public void requestCode(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String username = request.getUsername().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email) || users.existsByUsername(username)) {
            throw new IllegalArgumentException("Email hoặc tên đăng nhập đã được sử dụng");
        }
        if (mailFrom.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình SMTP và MAIL_FROM để gửi email");
        }
        LocalDateTime now = LocalDateTime.now();
        PendingRegistration pending = pendingRepository.findByEmailForUpdate(email).orElseGet(PendingRegistration::new);
        if (pending.getSentAt() != null && pending.getSentAt().plusMinutes(1).isAfter(now)) {
            throw new IllegalArgumentException("Vui lòng đợi 1 phút trước khi yêu cầu mã mới");
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        pending.setEmail(email);
        pending.setUsername(username);
        pending.setFullName(request.getFullName().trim());
        pending.setPasswordHash(encoder.encode(request.getPassword()));
        pending.setCodeHash(encoder.encode(code));
        pending.setAttempts(0);
        pending.setSentAt(now);
        pending.setExpiresAt(now.plusMinutes(10));
        pendingRepository.save(pending);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Smart Messenger - mã xác minh email");
        message.setText("Mã xác minh của bạn: " + code + "\nMã có hiệu lực trong 10 phút. Nếu không yêu cầu, hãy bỏ qua email này.");
        mailSender.send(message);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public User verify(VerifyEmailRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        PendingRegistration pending = pendingRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new IllegalArgumentException("Không có yêu cầu đăng ký cho email này"));
        if (!pending.getExpiresAt().isAfter(LocalDateTime.now())) {
            pendingRepository.delete(pending);
            throw new IllegalArgumentException("Mã đã hết hạn, vui lòng đăng ký lại");
        }
        if (pending.getAttempts() >= 5) {
            throw new IllegalArgumentException("Đã nhập sai quá nhiều lần, vui lòng đợi mã mới");
        }
        if (!encoder.matches(request.getCode(), pending.getCodeHash())) {
            pending.setAttempts(pending.getAttempts() + 1);
            throw new IllegalArgumentException("Mã xác minh không đúng");
        }
        if (users.existsByEmail(email) || users.existsByUsername(pending.getUsername())) {
            throw new IllegalArgumentException("Email hoặc tên đăng nhập đã được sử dụng");
        }
        User user = new User();
        user.setEmail(email);
        user.setUsername(pending.getUsername());
        user.setPassword(pending.getPasswordHash());
        user.setFullName(pending.getFullName());
        user.setRole(Role.ROLE_USER);
        user.setStatus(UserStatus.ACTIVE);
        user = users.save(user);
        pendingRepository.delete(pending);
        return user;
    }
}
