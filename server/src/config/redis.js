import logger from '../utils/logger.js';

// Simple in-memory fallback cache for rate-limiting, queues, and short-lived locks
class InMemoryRedisAdapter {
  constructor() {
    this.store = new Map();
    logger.info('Initialized In-Memory Redis Adapter');
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, ttl) {
    let expiresAt = null;
    if (mode === 'EX' && typeof ttl === 'number') {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key) {
    const current = await this.get(key);
    const newVal = (parseInt(current || '0', 10) + 1).toString();
    await this.set(key, newVal);
    return parseInt(newVal, 10);
  }
}

export const redisClient = new InMemoryRedisAdapter();
