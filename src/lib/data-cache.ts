/**
 * Data Cache Manager
 * Reduces Google Sheets API calls with intelligent caching
 */

import { errorLogger } from './error-logger';
import { API_CONFIG } from './config';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = API_CONFIG.REPORT_CACHE_TTL;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup interval only on server-side
    if (typeof window === 'undefined') {
      this.startCleanupInterval();
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    this.cache.set(key, entry);
    
    errorLogger.info(
      `Cache set: ${key}`,
      'DataCache',
      { ttl, expiresAt: new Date(entry.expiresAt).toISOString() }
    );
  }

  /**
   * Get cache entry
   * Returns undefined if not found or expired (distinguishes from null data)
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      errorLogger.info(`Cache miss: ${key}`, 'DataCache');
      return undefined;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      errorLogger.info(`Cache expired: ${key}`, 'DataCache');
      return undefined;
    }

    errorLogger.info(
      `Cache hit: ${key}`,
      'DataCache',
      { age: now - entry.timestamp, ttl: entry.expiresAt - now }
    );
    
    return entry.data as T;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    errorLogger.info(`Cache invalidated: ${key}`, 'DataCache');
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    errorLogger.info(
      `Cache pattern invalidated: ${pattern}`,
      'DataCache',
      { entriesRemoved: count }
    );
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    errorLogger.info(`Cache cleared`, 'DataCache', { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      errorLogger.info(
        `Cache cleanup completed`,
        'DataCache',
        { entriesRemoved: removed }
      );
    }
  }

  /**
   * Destroy cache and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Generate cache key for employee data
   */
  static employeeKey(employeeName: string): string {
    return `employee:${employeeName}`;
  }

  /**
   * Generate cache key for report data
   */
  static reportKey(employeeName: string, fromDate: string, toDate: string): string {
    return `report:${employeeName}:${fromDate}:${toDate}`;
  }

  /**
   * Generate cache key for active task
   */
  static activeTaskKey(employeeName: string): string {
    return `active_task:${employeeName}`;
  }
}

// Singleton instance
export const dataCache = new DataCache();

// Export class for static methods
export { DataCache };
