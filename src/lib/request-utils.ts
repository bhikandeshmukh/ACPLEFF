/**
 * Request Utilities
 * Handles retries, timeouts, and error recovery
 */

import { errorLogger } from './error-logger';
import { API_CONFIG } from './config';

export interface RequestOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute async function with retry logic and timeout
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RequestOptions = {}
): Promise<T> {
  const {
    maxRetries = API_CONFIG.MAX_RETRIES,
    retryDelay = API_CONFIG.RETRY_DELAY,
    timeout = API_CONFIG.REQUEST_TIMEOUT,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute with timeout
      return await executeWithTimeout(fn, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Log retry attempt
      errorLogger.warning(
        `Request failed, retrying (attempt ${attempt + 1}/${maxRetries})`,
        lastError,
        'executeWithRetry',
        { attempt, maxRetries }
      );

      // Wait before retrying
      await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
    }
  }

  // All retries exhausted
  errorLogger.error(
    `Request failed after ${maxRetries + 1} attempts`,
    lastError,
    'executeWithRetry',
    { maxRetries }
  );

  throw lastError || new Error('Request failed');
}

/**
 * Execute function with timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('econnrefused')) {
    return true;
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('econnreset')) {
    return true;
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }

  // Rate limit errors
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  return false;
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delayMs) {
      fn(...args);
      lastCallTime = now;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(
        () => {
          fn(...args);
          lastCallTime = Date.now();
          timeoutId = null;
        },
        delayMs - timeSinceLastCall
      );
    }
  };
}

/**
 * Deduplicate concurrent requests
 */
export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Return existing request if already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = fn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear specific key from deduplicator
   */
  clearKey(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }
}
