export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }
}

export async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  maxConcurrent: number
): Promise<T[]> {
  const limiter = new ConcurrencyLimiter(maxConcurrent);
  return Promise.all(tasks.map((task) => limiter.run(task)));
}
