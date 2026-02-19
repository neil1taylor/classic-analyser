import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@/services/api', () => ({
  validateApiKey: vi.fn(),
  setApiKeyForRequests: vi.fn(),
}));

vi.mock('@/services/vpc-api', () => ({
  validateVpcApiKey: vi.fn(),
}));

vi.mock('@/services/powervs-api', () => ({
  validatePowerVsApiKey: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { validateApiKey } from '@/services/api';
import { validateVpcApiKey } from '@/services/vpc-api';
import { validatePowerVsApiKey } from '@/services/powervs-api';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBeNull();
    expect(result.current.accountInfo).toBeNull();
  });

  it('logs in successfully with both Classic and VPC', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      companyName: 'TestCo',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
    });
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let mode: string | undefined;
    await act(async () => {
      mode = await result.current.login('test-key');
    });

    expect(mode).toEqual(['classic', 'vpc']);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe('test-key');
    expect(result.current.accountInfo?.companyName).toBe('TestCo');
    expect(result.current.infrastructureMode).toEqual(['classic', 'vpc']);
  });

  it('logs in with VPC-only when Classic fails', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No Classic access'));
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      valid: true,
      account: { ibmCloudAccountId: 'abc123', ibmCloudAccountName: 'VPC Co' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let mode: string | undefined;
    await act(async () => {
      mode = await result.current.login('vpc-key');
    });

    expect(mode).toEqual(['vpc']);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accountInfo?.companyName).toBe('VPC Co');
    expect(result.current.infrastructureMode).toEqual(['vpc']);
  });

  it('logs out and clears state', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, companyName: 'TestCo', email: '', firstName: '', lastName: '',
    });
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login('key'); });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => { result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBeNull();
    expect(result.current.accountInfo).toBeNull();
    expect(result.current.infrastructureMode).toBeNull();
  });

  it('clears session after 60 minutes of inactivity', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, companyName: 'TestCo', email: '', firstName: '', lastName: '',
    });
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login('key'); });
    expect(result.current.isAuthenticated).toBe(true);

    // Advance past 60 minutes
    act(() => { vi.advanceTimersByTime(60 * 60 * 1000 + 1000); });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resets inactivity timer on user activity', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, companyName: 'TestCo', email: '', firstName: '', lastName: '',
    });
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login('key'); });

    // Advance 50 minutes
    act(() => { vi.advanceTimersByTime(50 * 60 * 1000); });

    // Simulate activity
    act(() => { window.dispatchEvent(new Event('mousemove')); });

    // Advance another 50 minutes (should still be authed because timer was reset)
    act(() => { vi.advanceTimersByTime(50 * 60 * 1000); });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('propagates login errors when all validations fail', async () => {
    (validateApiKey as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid key'));
    (validateVpcApiKey as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('VPC auth failed'));
    (validatePowerVsApiKey as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('PowerVS auth failed'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => { await result.current.login('bad-key'); })
    ).rejects.toThrow('Invalid key');

    expect(result.current.isAuthenticated).toBe(false);
  });
});
