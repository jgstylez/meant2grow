/**
 * Simple in-memory cache for Firestore queries
 * Reduces redundant reads and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 30000) {
    // 30 seconds default TTL
    this.defaultTTL = defaultTTL;
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Create cache instances
export const platformAdminCache = new Cache(60000); // 1 minute TTL for platform admin data
export const organizationDataCache = new Cache(30000); // 30 seconds TTL for org data

/**
 * Cache key generators
 */
export const cacheKeys = {
  allUsers: () => "platform:users:all",
  allOrganizations: () => "platform:organizations:all",
  allMatches: () => "platform:matches:all",
  allGoals: () => "platform:goals:all",
  allRatings: () => "platform:ratings:all",
  allCalendarEvents: () => "platform:events:all",
  usersByOrg: (orgId: string) => `org:users:${orgId}`,
  matchesByOrg: (orgId: string) => `org:matches:${orgId}`,
  goalsByOrg: (orgId: string) => `org:goals:${orgId}`,
  ratingsByOrg: (orgId: string) => `org:ratings:${orgId}`,
};
