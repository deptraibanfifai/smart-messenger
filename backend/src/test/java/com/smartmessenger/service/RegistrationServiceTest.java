package com.smartmessenger.service;

import com.smartmessenger.dto.RegisterRequest;
import com.smartmessenger.dto.VerifyEmailRequest;
import com.smartmessenger.model.PendingRegistration;
import com.smartmessenger.repository.PendingRegistrationRepository;
import com.smartmessenger.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {
    @Mock PendingRegistrationRepository pending;
    @Mock UserRepository users;
    @Mock PasswordEncoder encoder;
    @Mock JavaMailSender mail;
    @InjectMocks RegistrationService service;

    @Test
    void registrationSendsCodeButDoesNotCreateAccountYet() {
        ReflectionTestUtils.setField(service, "mailFrom", "demo@example.com");
        RegisterRequest request = new RegisterRequest();
        request.setEmail("alice@example.com");
        request.setUsername("alice");
        request.setFullName("Alice");
        request.setPassword("correct-horse-battery");
        when(encoder.encode(anyString())).thenReturn("encoded");

        service.requestCode(request);

        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(sent.capture());
        assertArrayEquals(new String[]{"alice@example.com"}, sent.getValue().getTo());
        verify(pending).save(any(PendingRegistration.class));
        verify(users, never()).save(any());
    }

    @Test
    void wrongCodeDoesNotCreateAccount() {
        PendingRegistration awaiting = new PendingRegistration();
        awaiting.setEmail("alice@example.com");
        awaiting.setCodeHash("hash");
        awaiting.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        when(pending.findByEmailForUpdate("alice@example.com")).thenReturn(Optional.of(awaiting));
        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("alice@example.com");
        request.setCode("000000");

        assertThrows(IllegalArgumentException.class, () -> service.verify(request));
        assertEquals(1, awaiting.getAttempts());
        verify(users, never()).save(any());
    }
}
