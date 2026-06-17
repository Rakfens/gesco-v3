// cache.ts — Cache service with Realtime invalidation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 300000; // 5 min

  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
               ttl: number = this.defaultTTL,
  ): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new CacheService();

// Listen to Realtime events and invalidate cache
if (typeof window !== "undefined") {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ table?: string }>).detail;
    const { table } = detail || {};
    if (table) {
      cache.invalidate(table);
    }
  };
  window.addEventListener("supabase_realtime", handler);
}
