package com.musketeers.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Allows a limited number of attempts per key in each window, where a key's window starts at its first attempt. The
 * counts live in memory, so each instance of the application keeps its own and a restart forgets them.
 */
public class FixedWindowLimiter {
    private static final int SWEEP_THRESHOLD = 10_000;

    private final int limit;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public FixedWindowLimiter(int limit, Duration window, Clock clock) {
        this.limit = limit;
        this.window = window;
        this.clock = clock;
    }

    /**
     * Records an attempt for the key. Refused attempts count too, so retrying does not help.
     *
     * @param key what the attempts are limited by, such as an email address
     * @return true if the attempt is within the limit
     */
    public boolean tryAcquire(String key) {
        Instant now = clock.instant();
        if (windows.size() > SWEEP_THRESHOLD) {
            windows.values().removeIf(current -> current.hasEnded(now, window));
        }

        Window updated = windows.compute(key, (k, current) -> current == null || current.hasEnded(now, window)
                ? new Window(now, 1)
                : new Window(current.start(), current.count() + 1));
        return updated.count() <= limit;
    }

    /**
     * Forgets every attempt, so tests can start from a clean state.
     */
    public void reset() {
        windows.clear();
    }

    private record Window(Instant start, int count) {
        boolean hasEnded(Instant now, Duration length) {
            return !now.isBefore(start.plus(length));
        }
    }
}
