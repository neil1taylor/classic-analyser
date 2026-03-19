// Web Worker for offloading dashboard aggregation and cost calculations
// Keeps the main thread responsive during heavy data processing

export interface TransformWorkerMessage {
  type: 'aggregate-dashboard' | 'calculate-costs';
  payload: {
    data: Record<string, unknown[]>;
    domain: 'classic' | 'vpc' | 'powervs';
  };
}

export interface TransformWorkerResult {
  type: 'result' | 'error';
  payload: {
    result?: unknown;
    error?: string;
  };
}

self.onmessage = async (event: MessageEvent<TransformWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'aggregate-dashboard': {
        // Placeholder — wire in actual aggregation logic when ready
        self.postMessage({
          type: 'result',
          payload: { result: { domain: payload.domain, resourceCount: Object.keys(payload.data).length } },
        } as TransformWorkerResult);
        break;
      }
      case 'calculate-costs': {
        // Placeholder — wire in actual cost calculation when ready
        self.postMessage({
          type: 'result',
          payload: { result: { domain: payload.domain } },
        } as TransformWorkerResult);
        break;
      }
      default:
        self.postMessage({
          type: 'error',
          payload: { error: `Unknown transform type: ${type}` },
        } as TransformWorkerResult);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: error instanceof Error ? error.message : String(error) },
    } as TransformWorkerResult);
  }
};
