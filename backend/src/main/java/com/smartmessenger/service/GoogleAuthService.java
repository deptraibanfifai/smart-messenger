package com.smartmessenger.service;

import com.smartmessenger.model.Role;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.google.client-id:}")
    private String clientId;

    @Transactional
    public User authenticate(String credential) {
        if (clientId.isBlank()) throw new IllegalStateException("Chưa cấu hình GOOGLE_CLIENT_ID");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), jwt -> {
            String issuer = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();
            boolean issuerOk = "https://accounts.google.com".equals(issuer)
                    || "accounts.google.com".equals(issuer);
            boolean audienceOk = jwt.getAudience().contains(clientId);
            return issuerOk && audienceOk ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Google issuer/audience invalid", null));
        }));
        Jwt jwt;
        try {
            jwt = decoder.decode(credential);
        } catch (JwtException | IllegalArgumentException e) {
            System.err.println("GOOGLE VERIFY ERROR: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            throw new IllegalArgumentException("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn");
        }
        if (!Boolean.TRUE.equals(jwt.getClaim("email_verified"))) {
            throw new IllegalArgumentException("Email Google chưa được xác minh");
        }
        String email = jwt.getClaimAsString("email");
        String sub = jwt.getSubject();
        if (email == null || sub == null || email.isBlank() || sub.isBlank()) {
            throw new IllegalArgumentException("Tài khoản Google thiếu email hoặc định danh");
        }
        email = email.toLowerCase(Locale.ROOT);
        User existing = users.findByGoogleSub(sub).orElse(null);
        if (existing != null) {
            if (existing.getStatus() != UserStatus.ACTIVE) throw new IllegalArgumentException("Tài khoản đã bị khóa");
            return existing;
        }
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu; liên kết Google sẽ được hỗ trợ sau.");
        }
        User user = new User();
        user.setGoogleSub(sub);
        user.setEmail(email);
        user.setUsername(googleUsername(sub));
        byte[] unusedPassword = new byte[32];
        random.nextBytes(unusedPassword);
        user.setPassword(encoder.encode(HexFormat.of().formatHex(unusedPassword)));
        String name = jwt.getClaimAsString("name");
        user.setFullName(name == null || name.isBlank() ? email.substring(0, email.indexOf('@')) : name.substring(0, Math.min(100, name.length())));
        user.setRole(Role.ROLE_USER);
        user.setStatus(UserStatus.ACTIVE);
        return users.save(user);
    }

    private String googleUsername(String sub) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(sub.getBytes(StandardCharsets.UTF_8));
            return "google_" + HexFormat.of().formatHex(digest).substring(0, 40);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo tên đăng nhập Google", e);
        }
    }
}
