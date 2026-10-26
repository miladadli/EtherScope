export type RetryOptions = {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
};

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseMs = opts.baseMs ?? 200;
  const maxMs = opts.maxMs ?? 5_000;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) {
        break;
      }
      const exp = Math.min(maxMs, baseMs * 2 ** i);
      const jitter = Math.floor(Math.random() * exp * 0.2);
      await new Promise((r) => setTimeout(r, exp + jitter));
    }
  }

  throw lastError;
}
