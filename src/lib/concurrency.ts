/**
 * Concurrency Limiter Utility
 * Controls parallel execution with a maximum concurrency limit
 * Prevents unbounded Promise.all() calls that can overwhelm APIs
 */

export interface ConcurrencyLimiter {
  <T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Creates a concurrency limiter that ensures at most `limit` promises
 * are executing simultaneously
 */
export function createConcurrencyLimiter(limit: number): ConcurrencyLimiter {
  if (limit < 1) {
    throw new Error('Concurrency limit must be at least 1');
  }

  let activeCount = 0;
  const queue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    fn: () => Promise<unknown>;
  }> = [];

  const processNext = (): void => {
    if (queue.length === 0 || activeCount >= limit) {
      return;
    }

    const next = queue.shift();
    if (!next) return;

    activeCount++;

    next
      .fn()
      .then((result) => {
        activeCount--;
        next.resolve(result);
        processNext();
      })
      .catch((error) => {
        activeCount--;
        next.reject(error);
        processNext();
      });
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        fn,
      });
      processNext();
    });
  };
}

/**
 * Process an array of items with limited concurrency
 * Similar to p-map but without external dependencies
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  options: { concurrency: number }
): Promise<R[]> {
  const { concurrency } = options;
  const limiter = createConcurrencyLimiter(concurrency);

  const promises = items.map((item, index) =>
    limiter(() => mapper(item, index))
  );

  return Promise.all(promises);
}

/**
 * Batch processor that groups items and processes batches with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: {
    batchSize: number;
    concurrency: number;
  }
): Promise<R[]> {
  const { batchSize, concurrency } = options;

  // Create batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches with concurrency limit
  const results = await mapWithConcurrency(batches, processor, { concurrency });

  // Flatten results
  return results.flat();
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 5000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 100,
        maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
