package com.smartmessenger.service;

import com.smartmessenger.dto.AiChatRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiServiceTest {
    private static final String URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    private AiService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        service = new AiService(null, null);
        ReflectionTestUtils.setField(service, "apiUrl", URL);
        RestTemplate client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        server = MockRestServiceServer.createServer(client);
    }

    private AiChatRequest question() {
        AiChatRequest request = new AiChatRequest();
        request.setPrompt("Chào bạn");
        return request;
    }

    @Test
    void projectIdIsRejectedBeforeCallingGoogle() {
        ReflectionTestUtils.setField(service, "apiKey", "gen-lang-client-123456");
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertTrue(error.getReason().contains("Project ID"));
        server.verify();
    }

    @Test
    void googleErrorDoesNotLeakApiKeyAndExplainsInvalidKey() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andExpect(header("x-goog-api-key", "private-test-key"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body(
                        "{\"error\":{\"message\":\"API key not valid. Please pass a valid API key.\"}}"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertTrue(error.getReason().contains("API key không hợp lệ"));
        assertFalse(error.getReason().contains("private-test-key"));
        server.verify();
    }

    @Test
    void successfulTextResponseIsReturned() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andRespond(withSuccess(
                "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Xin chào!\"}]}}]}",
                org.springframework.http.MediaType.APPLICATION_JSON));
        assertEquals("Xin chào!", service.chatWithAi(question(), 1L).getResponse());
        server.verify();
    }
    @Test
    void readTimeoutShowsItsCauseInsteadOfAnInvalidKeyMessage() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andRespond(
                org.springframework.test.web.client.response.MockRestResponseCreators.withException(
                        new java.net.SocketTimeoutException("Read timed out")));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, error.getStatusCode());
        assertTrue(error.getReason().contains("GEMINI_READ_TIMEOUT"));
        assertTrue(error.getReason().contains("60 giây"));
        server.verify();
    }

    @Test
    void certificateFailureIsIdentifiedWithoutExposingSecrets() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andRespond(
                org.springframework.test.web.client.response.MockRestResponseCreators.withException(
                        new javax.net.ssl.SSLHandshakeException("certificate chain failure")));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertTrue(error.getReason().contains("GEMINI_TLS"));
        assertFalse(error.getReason().contains("private-test-key"));
        server.verify();
    }

    @Test
    void dnsFailureIsIdentifiedSeparately() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andRespond(
                org.springframework.test.web.client.response.MockRestResponseCreators.withException(
                        new java.net.UnknownHostException("provider")));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertTrue(error.getReason().contains("GEMINI_DNS"));
        server.verify();
    }

}
