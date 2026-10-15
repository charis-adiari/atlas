import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('shows its title and message as a status', () => {
    // Arrange
    render(<Toast title="Account created" message="Welcome aboard." onDismiss={vi.fn()} />);

    // Act
    const status = screen.getByRole('status');

    // Assert
    expect(status).toHaveTextContent('Account created');
    expect(status).toHaveTextContent('Welcome aboard.');
  });

  it('dismisses itself after a few seconds', () => {
    // Arrange
    const onDismiss = vi.fn();
    render(<Toast title="Account created" message="Welcome aboard." onDismiss={onDismiss} />);

    // Act
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    // Assert
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss itself before the time is up', () => {
    // Arrange
    const onDismiss = vi.fn();
    render(<Toast title="Account created" message="Welcome aboard." onDismiss={onDismiss} />);

    // Act
    act(() => {
      vi.advanceTimersByTime(7999);
    });

    // Assert
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
