package com.smartmessenger.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.smartmessenger.security.JwtUtils;
import com.smartmessenger.security.UserDetailsServiceImpl;
import com.smartmessenger.security.UserDetailsImpl;
import com.smartmessenger.repository.ConversationMemberRepository;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl users;
    private final ConversationMemberRepository members;

    @Value("${app.websocket.allowed-origins:http://localhost:*,http://127.0.0.1:*}")
    private String allowedOrigins;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "STOMP headers không hợp lệ");
                }                System.out.printf(
                        "STOMP command=%s, destination=%s, hasUser=%s%n",
                        accessor.getCommand(),
                        accessor.getDestination(),
                        accessor.getUser() != null
                );
                if (accessor.getCommand() == StompCommand.CONNECT) {
                    String bearer = accessor.getFirstNativeHeader("Authorization");
                    if (bearer == null || !bearer.startsWith("Bearer ") || !jwtUtils.validateJwtToken(bearer.substring(7)))
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "STOMP token không hợp lệ");
                    UserDetailsImpl user = (UserDetailsImpl) users.loadUserByUsername(jwtUtils.getUserNameFromJwtToken(bearer.substring(7)));
                    if (!user.isEnabled()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
                    accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
                } else if (accessor.getCommand() == StompCommand.SUBSCRIBE || accessor.getCommand() == StompCommand.SEND) {
                    if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) ||
                            !(auth.getPrincipal() instanceof UserDetailsImpl user) || !user.isEnabled() ||
                            !((UserDetailsImpl) users.loadUserByUsername(user.getUsername())).isEnabled())
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
                    String destination = accessor.getDestination();
                    if (destination == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                    if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
                        if (destination.startsWith("/topic/conversation/")) {
                            try {
                                Long id = Long.valueOf(destination.substring("/topic/conversation/".length()));
                                if (!members.existsByConversationIdAndUserId(id, user.getId())) throw new NumberFormatException();
                            } catch (NumberFormatException ex) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
                        } else if (!destination.equals("/topic/presence") &&
                                !destination.equals("/topic/profiles") &&
                                !destination.equals("/user/queue/chat-events") &&
                                !destination.equals("/user/queue/read") &&
                                !(destination.startsWith("/topic/typing/") &&
                                        isConversationMember(destination.substring("/topic/typing/".length()), user.getId())))
                            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                    } else if (!destination.equals("/app/chat.sendMessage") &&
                            !destination.equals("/app/chat.typing")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                }
                return message;
            }
        });
    }

    private boolean isConversationMember(String id, Long userId) {
        try { return members.existsByConversationIdAndUserId(Long.valueOf(id), userId); }
        catch (NumberFormatException e) { return false; }
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for topics and private user queues
        config.enableSimpleBroker("/topic", "/queue", "/user");
        // Prefix for messages routed to @MessageMapping controller methods
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific destination
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The endpoint clients connect to using SockJS / STOMP
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns(allowedOrigins.split(","));
    }
}
