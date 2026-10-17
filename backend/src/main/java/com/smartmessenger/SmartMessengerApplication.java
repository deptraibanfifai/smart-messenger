package com.smartmessenger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.messaging.support.MessageHeaderAccessor;

@SpringBootApplication
public class SmartMessengerApplication {
    public static void main(String[] args) {

        SpringApplication.run(SmartMessengerApplication.class, args);
        System.out.println("=================================================");
        System.out.println("SMART MESSENGER BACKEND IS RUNNING ON PORT 8080");
        System.out.println("WEBSOCKET ENDPOINT: ws://localhost:8080/ws");
        System.out.println("=================================================");
    }
}
