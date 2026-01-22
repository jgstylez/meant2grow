/**
 * Rate limiter for database queries
 * Prevents excessive reads and helps manage costs
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Check if request is allowed
   * @param key Unique identifier for the rate limit (e.g., userId, queryType)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // Create new window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (record.count >= this.config.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(key: string): number {
    const record = this.requests.get(key);
    if (!record) return this.config.maxRequests;
    return Math.max(0, this.config.maxRequests - record.count);
  }

  /**
   * Get time until reset (in ms)
   */
  getResetTime(key: string): number {
    const record = this.requests.get(key);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }
}

// Create rate limiters for different query types
export const platformAdminRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60000, // per minute
});

export const organizationDataRateLimiter = new RateLimiter({
  maxRequests: 200, // 200 requests
  windowMs: 60000, // per minute
});

/**
 * Decorator function to rate limit async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  rateLimiter: RateLimiter,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : "default";
    
    if (!rateLimiter.isAllowed(key)) {
      const remaining = rateLimiter.getRemaining(key);
      const resetTime = rateLimiter.getResetTime(key);
      throw new Error(
        `Rate limit exceeded. ${remaining} requests remaining. Try again in ${Math.ceil(resetTime / 1000)} seconds.`
      );
    }

    return fn(...args);
  }) as T;
}
