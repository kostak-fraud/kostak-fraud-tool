package com.kostak.fraud.identity;

import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SupabaseJwtDecoderTest {

    private static final String ISSUER = "https://tenant.supabase.co/auth/v1";
    private static final String AUDIENCE = "authenticated";
    private static RSAKey signingKey;
    private static HttpServer jwksServer;
    private static String jwksUrl;

    @BeforeAll
    static void startJwksServer() throws Exception {
        signingKey = new RSAKeyGenerator(2048).keyID("iam-test-key").generate();
        jwksServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        jwksServer.createContext("/jwks", exchange -> {
            byte[] body = new JWKSet(signingKey.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        jwksServer.start();
        jwksUrl = "http://127.0.0.1:" + jwksServer.getAddress().getPort() + "/jwks";
    }

    @AfterAll
    static void stopJwksServer() {
        if (jwksServer != null) {
            jwksServer.stop(0);
        }
    }

    @Test
    void acceptsValidSignatureIssuerAudienceAndExpiry() {
        JwtDecoder decoder = decoder();
        Jwt decoded = decoder.decode(token(signingKey, ISSUER, AUDIENCE, Instant.now().plusSeconds(60)));

        assertThat(decoded.getSubject()).isEqualTo("d2719b13-7e54-4c3b-8e3c-9c70f8c4a021");
    }

    @Test
    void rejectsInvalidSignature() throws Exception {
        RSAKey otherKey = new RSAKeyGenerator(2048).keyID("different-key").generate();

        assertThatThrownBy(() -> decoder().decode(
                token(otherKey, ISSUER, AUDIENCE, Instant.now().plusSeconds(60))
        )).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsWrongIssuerAudienceAndExpiredTokens() {
        JwtDecoder decoder = decoder();

        assertThatThrownBy(() -> decoder.decode(
                token(signingKey, "https://wrong.supabase.co/auth/v1", AUDIENCE, Instant.now().plusSeconds(60))
        )).isInstanceOf(JwtException.class);

        assertThatThrownBy(() -> decoder.decode(
                token(signingKey, ISSUER, "other-audience", Instant.now().plusSeconds(60))
        )).isInstanceOf(JwtException.class);

        assertThatThrownBy(() -> decoder.decode(
                token(signingKey, ISSUER, AUDIENCE, Instant.now().minusSeconds(300))
        )).isInstanceOf(JwtException.class);
    }

    private JwtDecoder decoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl)
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.RS256);
                    algorithms.add(SignatureAlgorithm.ES256);
                })
                .build();
        OAuth2TokenValidator<Jwt> issuerAndTime = JwtValidators.createDefaultWithIssuer(ISSUER);
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains(AUDIENCE)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuerAndTime, audience));
        return decoder;
    }

    private String token(RSAKey key, String issuer, String audience, Instant expiresAt) {
        JWKSource<SecurityContext> source = new ImmutableJWKSet<>(new JWKSet(key));
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(source);
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(UUID.fromString("d2719b13-7e54-4c3b-8e3c-9c70f8c4a021").toString())
                .audience(List.of(audience))
                .issuedAt(now.minusSeconds(600))
                .expiresAt(expiresAt)
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.getKeyID()).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
