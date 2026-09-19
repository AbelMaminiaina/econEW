import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './useMediaQuery';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '',
    addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    mql,
    fire: (next: boolean) => {
      // Real MediaQueryList objects update `.matches` before dispatching the
      // change event; the hook re-syncs against it on every effect re-run.
      mql.matches = next;
      act(() => {
        listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
      });
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('reflects the initial match state', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', async () => {
    const { fire } = mockMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    fire(true);

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('registers the query string passed to matchMedia', () => {
    mockMatchMedia(false);

    renderHook(() => useMediaQuery('(max-width: 500px)'));

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 500px)');
  });
});

describe('useIsMobile / useIsTablet / useIsDesktop', () => {
  it('useIsMobile queries the mobile breakpoint', () => {
    mockMatchMedia(true);
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('useIsTablet queries the tablet breakpoint', () => {
    mockMatchMedia(true);
    renderHook(() => useIsTablet());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 769px) and (max-width: 1024px)');
  });

  it('useIsDesktop queries the desktop breakpoint', () => {
    mockMatchMedia(true);
    renderHook(() => useIsDesktop());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1025px)');
  });
});
