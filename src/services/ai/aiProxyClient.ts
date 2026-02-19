import axios from 'axios';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const TIMEOUT_MS = 30000;

async function fetchServerConfigured(): Promise<boolean> {
  try {
    const res = await axios.get<{ configured: boolean }>('/api/ai/config', { timeout: 5000 });
    return res.data?.configured ?? false;
  } catch {
    return false;
  }
}

function createClient() {
  return axios.create({
    baseURL: '/api/ai',
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function proxyPost<T>(path: string, data: unknown): Promise<T> {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.post<T>(path, data);
    return response.data;
  });
}

export async function proxyGet<T>(path: string): Promise<T> {
  const client = createClient();
  const response = await client.get<T>(path);
  return response.data;
}

export async function isAIConfigured(): Promise<boolean> {
  const enabled = localStorage.getItem('ai_enabled') === 'true';
  if (!enabled) return false;
  return fetchServerConfigured();
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = createClient();
    const response = await client.get('/health', { timeout: 15000 });
    return response.data?.status === 'healthy';
  } catch {
    return false;
  }
}
