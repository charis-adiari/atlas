import { useEffect, useState } from 'react';

export const RESEND_DELAY_SECONDS = 30;

const MILLIS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/**
 * Represents the pause before a verification email can be sent again.
 */
export interface UseResendCountdownResult {
  secondsLeft: number;
  canResend: boolean;
  label: string;
  restart: () => void;
}

/**
 * Counts down the pause before another verification email may be requested. The label reads "0:30" style while it runs.
 */
export function useResendCountdown(): UseResendCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);
  const isCountingDown = secondsLeft > 0;

  useEffect(() => {
    if (!isCountingDown) {
      return;
    }
    const timer = setInterval(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      MILLIS_PER_SECOND
    );
    return () => clearInterval(timer);
  }, [isCountingDown]);

  const minutes = Math.floor(secondsLeft / SECONDS_PER_MINUTE);
  const seconds = String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0');

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    label: `${minutes}:${seconds}`,
    restart: () => setSecondsLeft(RESEND_DELAY_SECONDS)
  };
}
