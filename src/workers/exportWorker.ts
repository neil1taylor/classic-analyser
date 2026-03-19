// Web Worker for offloading XLSX/PDF/DOCX generation from the main thread
// Communicates via structured messages to avoid blocking UI during large exports
//
// Usage (from main thread):
//   const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
//   worker.postMessage({ type: 'generate-xlsx', payload: { ... } });
//   worker.onmessage = (e) => { /* handle result */ };

export interface ExportWorkerMessage {
  type: 'generate-xlsx' | 'generate-pdf' | 'generate-docx';
  payload: {
    data: Record<string, unknown[]>;
    options: Record<string, unknown>;
  };
}

export interface ExportWorkerResult {
  type: 'result' | 'error' | 'progress';
  payload: {
    blob?: Blob;
    error?: string;
    progress?: number;
  };
}

// Worker entry point — dynamically import heavy libraries to avoid loading them in the main bundle
self.onmessage = async (event: MessageEvent<ExportWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    // Placeholder: wire in actual export logic per format
    // Each case should dynamically import the relevant export module
    self.postMessage({
      type: 'error',
      payload: { error: `Export type "${type}" not yet wired to worker (data keys: ${Object.keys(payload.data).length})` },
    } as ExportWorkerResult);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: error instanceof Error ? error.message : String(error) },
    } as ExportWorkerResult);
  }
};
