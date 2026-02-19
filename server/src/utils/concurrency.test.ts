import { describe, it, expect } from 'vitest';
import { ConcurrencyLimiter, runWithConcurrencyLimit } from './concurrency.js';

describe('ConcurrencyLimiter', () => {
  it('runs tasks up to the concurrency limit', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const running: number[] = [];
    let maxRunning = 0;

    const makeTask = (id: number) => async () => {
      running.push(id);
      maxRunning = Math.max(maxRunning, running.length);
      await new Promise((r) => setTimeout(r, 50));
      running.splice(running.indexOf(id), 1);
      return id;
    };

    const results = await Promise.all([
      limiter.run(makeTask(1)),
      limiter.run(makeTask(2)),
      limiter.run(makeTask(3)),
      limiter.run(makeTask(4)),
    ]);

    expect(results).toEqual([1, 2, 3, 4]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('handles a single task', async () => {
    const limiter = new ConcurrencyLimiter(5);
    const result = await limiter.run(async () => 42);
    expect(result).toBe(42);
  });

  it('propagates errors', async () => {
    const limiter = new ConcurrencyLimiter(2);
    await expect(
      limiter.run(async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');
  });

  it('releases slot on error so subsequent tasks can run', async () => {
    const limiter = new ConcurrencyLimiter(1);
    await expect(
      limiter.run(async () => { throw new Error('fail'); })
    ).rejects.toThrow();

    const result = await limiter.run(async () => 'ok');
    expect(result).toBe('ok');
  });
});

describe('runWithConcurrencyLimit', () => {
  it('runs all tasks respecting limit', async () => {
    const results = await runWithConcurrencyLimit(
      [
        async () => 1,
        async () => 2,
        async () => 3,
      ],
      2
    );
    expect(results).toEqual([1, 2, 3]);
  });

  it('handles empty task array', async () => {
    const results = await runWithConcurrencyLimit([], 5);
    expect(results).toEqual([]);
  });

  it('enforces concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return true;
    });

    await runWithConcurrencyLimit(tasks, 3);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
