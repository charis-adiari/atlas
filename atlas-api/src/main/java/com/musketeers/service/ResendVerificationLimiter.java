package com.musketeers.service;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Duration;

/**
 * Limits how often a verification email can be requested, per email address so nobody's inbox can be flooded, and per
 * client address so one client cannot work through many inboxes. None of the limits has a default: the application
 * refuses to start when one is missing from the configuration.
 */
@ApplicationScoped
public class ResendVerificationLimiter {
    private final FixedWindowLimiter perEmail;
    private final FixedWindowLimiter perClientAddress;

    public ResendVerificationLimiter(
            @ConfigProperty(name = "app.auth.resend-verification.per-email-limit") int perEmailLimit,
            @ConfigProperty(name = "app.auth.resend-verification.per-client-address-limit") int perClientAddressLimit,
            @ConfigProperty(name = "app.auth.resend-verification.window") Duration window
    ) {
        Clock clock = Clock.systemUTC();
        this.perEmail = new FixedWindowLimiter(perEmailLimit, window, clock);
        this.perClientAddress = new FixedWindowLimiter(perClientAddressLimit, window, clock);
    }

    /**
     * Records a request for the email address.
     *
     * @param email the lower-cased address the link would be sent to
     * @return true if the request is within the limit
     */
    public boolean tryAcquireForEmail(String email) {
        return perEmail.tryAcquire(email);
    }

    /**
     * Records a request from the client address.
     *
     * @param clientAddress IP address the request came from
     * @return true if the request is within the limit
     */
    public boolean tryAcquireForClientAddress(String clientAddress) {
        return perClientAddress.tryAcquire(clientAddress);
    }

    /**
     * Forgets every request, so tests can start from a clean state.
     */
    public void reset() {
        perEmail.reset();
        perClientAddress.reset();
    }
}
