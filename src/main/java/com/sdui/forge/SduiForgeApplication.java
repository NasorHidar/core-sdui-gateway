package com.sdui.forge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * SDUI Forge — Server-Driven UI Metadata Engine.
 *
 * <p>Entry point for the core banking SDUI gateway.
 * Virtual threads are enabled via {@code spring.threads.virtual.enabled=true}
 * in application.yml — no programmatic configuration needed.</p>
 */
@SpringBootApplication
public class SduiForgeApplication {

    public static void main(String[] args) {
        SpringApplication.run(SduiForgeApplication.class, args);
    }
}
