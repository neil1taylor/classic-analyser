import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/services/api', () => ({
  exportData: vi.fn(),
  validateApiKey: vi.fn(),
  setApiKeyForRequests: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { exportData } from '@/services/api';
import { useExport } from './useExport';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  );
}

describe('useExport', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/abc');
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with isExporting false', () => {
    const { result } = renderHook(() => useExport(), { wrapper });
    expect(result.current.isExporting).toBe(false);
  });

  it('exportAll triggers download with correct filename', async () => {
    const mockBlob = new Blob(['test']);
    (exportData as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlob);

    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      (node as HTMLAnchorElement).click = clickSpy;
      return node;
    });
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const { result } = renderHook(() => useExport(), { wrapper });

    await act(async () => {
      await result.current.exportAll();
    });

    expect(exportData).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('exportTable includes resource key in filename', async () => {
    const mockBlob = new Blob(['test']);
    (exportData as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlob);

    // Capture the anchor created by triggerDownload
    let downloadAnchor: HTMLAnchorElement | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreate(tag, options);
      if (tag === 'a') {
        downloadAnchor = el as HTMLAnchorElement;
        (el as HTMLAnchorElement).click = vi.fn();
      }
      return el;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const { result } = renderHook(() => useExport(), { wrapper });

    await act(async () => {
      await result.current.exportTable('virtualServers', [{ id: 1 }]);
    });

    expect(downloadAnchor).not.toBeNull();
    expect(downloadAnchor!.download).toContain('virtualServers');
  });

  it('exportSelected includes "selected" in filename', async () => {
    const mockBlob = new Blob(['test']);
    (exportData as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlob);

    let downloadAnchor: HTMLAnchorElement | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreate(tag, options);
      if (tag === 'a') {
        downloadAnchor = el as HTMLAnchorElement;
        (el as HTMLAnchorElement).click = vi.fn();
      }
      return el;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const { result } = renderHook(() => useExport(), { wrapper });

    await act(async () => {
      await result.current.exportSelected('vlans', [{ id: 1 }]);
    });

    expect(downloadAnchor).not.toBeNull();
    expect(downloadAnchor!.download).toContain('selected');
  });
});
