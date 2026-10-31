package com.musketeers.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class FixedWindowLimiterTests {
    private static final Duration WINDOW = Duration.ofHours(1);
    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");

    private final MovableClock clock = new MovableClock();
    private final FixedWindowLimiter limiter = new FixedWindowLimiter(2, WINDOW, clock);

    @Test
    void tryAcquire_AllowsAttemptsUpToTheLimitAndRefusesTheRest() {
        // Act & Assert
        assertTrue(limiter.tryAcquire("a"));
        assertTrue(limiter.tryAcquire("a"));
        assertFalse(limiter.tryAcquire("a"));
        assertFalse(limiter.tryAcquire("a"));
    }

    @Test
    void tryAcquire_CountsEachKeySeparately() {
        // Arrange
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");

        // Act & Assert
        assertTrue(limiter.tryAcquire("b"));
    }

    @Test
    void tryAcquire_WhenTheWindowHasEnded_StartsCountingAgain() {
        // Arrange
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");
        clock.now = START.plus(WINDOW).minusMillis(1);
        assertFalse(limiter.tryAcquire("a"));

        // Act
        clock.now = START.plus(WINDOW);

        // Assert
        assertTrue(limiter.tryAcquire("a"));
    }

    @Test
    void reset_ForgetsEveryAttempt() {
        // Arrange
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");

        // Act
        limiter.reset();

        // Assert
        assertTrue(limiter.tryAcquire("a"));
    }

    private static final class MovableClock extends Clock {
        Instant now = START;

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
