package com.smartmessenger.service;

import com.smartmessenger.dto.AuthResponse;
import com.smartmessenger.dto.LoginRequest;
import com.smartmessenger.dto.RegisterRequest;
import com.smartmessenger.dto.VerifyEmailRequest;
import com.smartmessenger.model.User;
import com.smartmessenger.model.UserStatus;
import com.smartmessenger.repository.UserRepository;
import com.smartmessenger.security.JwtUtils;
import com.smartmessenger.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final RegistrationService registrationService;
    private final GoogleAuthService googleAuthService;

    public void register(RegisterRequest request) {
        registrationService.requestCode(request);
    }

    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        return tokenFor(registrationService.verify(request));
    }

    public AuthResponse googleLogin(String credential) {
        return tokenFor(googleAuthService.authenticate(credential));
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUsername().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByUsername(identifier)
                .or(() -> identifier.contains("@") ? userRepository.findByEmail(identifier) : Optional.empty())
                .orElseThrow(() -> new BadCredentialsException("Sai tài khoản hoặc mật khẩu"));

        if (user.getStatus() == UserStatus.BANNED) {
            throw new BadCredentialsException("Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        return responseFor(authentication, user);
    }

    private AuthResponse tokenFor(User user) {
        UserDetailsImpl principal = UserDetailsImpl.build(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        return responseFor(auth, user);
    }

    private AuthResponse responseFor(Authentication authentication, User user) {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return AuthResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .fullName(userDetails.getFullName())
                .avatarUrl(userDetails.getAvatarUrl())
                .role(user.getRole().name())
                .build();
    }
}
