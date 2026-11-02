package com.smartmessenger.service;

import com.smartmessenger.dto.AiChatRequest;
import com.smartmessenger.dto.AiSummaryRequest;
import com.smartmessenger.model.Message;
import com.smartmessenger.model.MessageType;
import com.smartmessenger.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AiServiceTest {
    private static final String URL = "https://api.groq.com/openai/v1/chat/completions";
    private AiService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        service = new AiService(null, null);
        ReflectionTestUtils.setField(service, "apiUrl", URL);
        ReflectionTestUtils.setField(service, "model", "openai/gpt-oss-120b");
        server = MockRestServiceServer.createServer((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate"));
    }

    private AiChatRequest question() {
        AiChatRequest request = new AiChatRequest();
        request.setPrompt("Chào bạn");
        return request;
    }

    @Test
    void missingKeyShowsConfigurationError() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertTrue(error.getReason().contains("GROQ_API_KEY"));
        server.verify();
    }

    @Test
    void chatUsesBearerAndGroqFormat() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andExpect(header("Authorization", "Bearer private-test-key"))
                .andExpect(content().string(containsString("openai/gpt-oss-120b")))
                .andExpect(content().string(containsString("Chào bạn")))
                .andRespond(withSuccess("{\"choices\":[{\"message\":{\"content\":\"Xin chào!\"}}]}",
                        org.springframework.http.MediaType.APPLICATION_JSON));
        assertEquals("Xin chào!", service.chatWithAi(question(), 1L).getResponse());
        server.verify();
    }

    @Test
    void keyErrorDoesNotRevealSecret() {
        ReflectionTestUtils.setField(service, "apiKey", "private-test-key");
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                .body("{\"error\":{\"message\":\"private-test-key invalid\"}}"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.chatWithAi(question(), 1L));
        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertFalse(error.getReason().contains("private-test-key"));
        server.verify();
    }

    @Test
    void summaryUsesRecentTextChronologicallyAndSkipsFiles() {
        MessageRepository repository = mock(MessageRepository.class);
        ChatService chats = mock(ChatService.class);
        AiService summaryService = new AiService(repository, chats);
        ReflectionTestUtils.setField(summaryService, "apiUrl", URL);
        ReflectionTestUtils.setField(summaryService, "apiKey", "private-test-key");
        ReflectionTestUtils.setField(summaryService, "model", "openai/gpt-oss-120b");
        MockRestServiceServer summaryServer = MockRestServiceServer.createServer(
                (RestTemplate) ReflectionTestUtils.getField(summaryService, "restTemplate"));
        when(repository.findByConversationIdOrderByCreatedAtDesc(eq(7L), any()))
                .thenReturn(new PageImpl<>(List.of(
                        Message.builder().content("tin mới").messageType(MessageType.TEXT).build(),
                        Message.builder().content("file.png").messageType(MessageType.IMAGE).build(),
                        Message.builder().content("tin cũ").messageType(MessageType.TEXT).build())));
        summaryServer.expect(requestTo(URL))
                .andExpect(content().string(containsString("Thành viên: tin cũ\\nThành viên: tin mới")))
                .andExpect(content().string(not(containsString("file.png"))))
                .andRespond(withSuccess("{\"choices\":[{\"message\":{\"content\":\"Tóm tắt\"}}]}",
                        org.springframework.http.MediaType.APPLICATION_JSON));
        AiSummaryRequest request = new AiSummaryRequest();
        request.setConversationId(7L);
        assertEquals("Tóm tắt", summaryService.summarizeConversation(request, 1L).getResponse());
        summaryServer.verify();
    }
}
