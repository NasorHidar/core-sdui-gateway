package com.sdui.forge.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT authentication filter — executes once per request before Spring Security's
 * authorization checks.
 *
 * <p>Flow:
 * <ol>
 *     <li>Extract Bearer token from {@code Authorization} header</li>
 *     <li>Validate signature, expiration, and issuer via {@link JwtTokenProvider}</li>
 *     <li>Extract userId and roles from valid token</li>
 *     <li>Set {@link UsernamePasswordAuthenticationToken} in the SecurityContext</li>
 * </ol>
 *
 * <p>If no token is present or validation fails, the request proceeds unauthenticated.
 * Spring Security's authorization layer will then reject it with 401/403 as appropriate.</p>
 *
 * <p>Thread-safe: stateless filter — no mutable instance state. Safe for concurrent
 * virtual thread execution.</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && jwtTokenProvider.validateToken(token)) {
            String userId = jwtTokenProvider.getUserId(token);
            List<String> roles = jwtTokenProvider.getRoles(token);

            // Convert role strings to Spring Security GrantedAuthority instances
            List<SimpleGrantedAuthority> authorities = roles.stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Authenticated user={} with roles={} for URI={}",
                    userId, roles, request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extracts the JWT from the Authorization header.
     *
     * @return the raw JWT string, or null if absent/malformed
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
