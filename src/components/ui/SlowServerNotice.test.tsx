import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SLOW_SERVER_MESSAGE, SlowServerNotice } from './SlowServerNotice';

describe('SlowServerNotice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('aparece só após 4 s de operação em curso e some quando ela termina', () => {
    const { rerender } = render(<SlowServerNotice pending />);

    act(() => vi.advanceTimersByTime(3_999));
    expect(screen.queryByText(SLOW_SERVER_MESSAGE)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(SLOW_SERVER_MESSAGE);
    expect(notice).toHaveAttribute('aria-live', 'polite');

    rerender(<SlowServerNotice pending={false} />);
    expect(screen.queryByText(SLOW_SERVER_MESSAGE)).not.toBeInTheDocument();
  });

  it('não aparece se a operação termina antes do limite', () => {
    const { rerender } = render(<SlowServerNotice pending />);
    act(() => vi.advanceTimersByTime(2_000));
    rerender(<SlowServerNotice pending={false} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByText(SLOW_SERVER_MESSAGE)).not.toBeInTheDocument();
  });
});
