package com.sdui.forge.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration for the SDUI gateway.
 *
 * <p>Design decisions:
 * <ul>
 *     <li><b>Stateless sessions</b> — JWT-only auth, no server-side session.
 *         Compatible with horizontal pod scaling and virtual threads.</li>
 *     <li><b>CSRF disabled</b> — API-only service with Bearer token auth;
 *         CSRF is not applicable for stateless REST APIs.</li>
 *     <li><b>Method-level security</b> — {@code @PreAuthorize} annotations
 *         on controllers/services enforce role-based access per endpoint.</li>
 *     <li><b>Public endpoints</b> — Auth, actuator health, and CORS preflight
 *         bypass the JWT filter entirely.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // enables @PreAuthorize, @Secured, @RolesAllowed
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Value("${sdui.security.allowed-origins:http://localhost:*,https://*.sdui-forge.com}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF — stateless JWT API
                .csrf(AbstractHttpConfigurer::disable)

                // CORS — allow frontend origins
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Stateless session — no HttpSession, no JSESSIONID
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Custom 401 handler that returns JSON
                .exceptionHandling(exceptions ->
                        exceptions.authenticationEntryPoint(jwtAuthenticationEntryPoint))

                // ──── Authorization Rules ────
                .authorizeHttpRequests(auth -> auth
                        // Public: authentication endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Public: actuator health probes (k8s readiness/liveness)
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()

                        // Public: CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Secured: metadata endpoints require authentication
                        .requestMatchers("/api/v1/pages/**").authenticated()
                        .requestMatchers("/api/v1/menus/**").authenticated()

                        // Secured: all core banking API proxies
                        .requestMatchers("/api/v1/core/**").authenticated()

                        // Default: deny everything else
                        .anyRequest().authenticated()
                )

                // Insert JWT filter before the default UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS configuration source.
     *
     * <p>Allows the Next.js frontend (default dev port 3000) and any
     * additional origins specified. In production, restrict to the
     * actual domain via environment-specific configuration.</p>
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "X-Request-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
