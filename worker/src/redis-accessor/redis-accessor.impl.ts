import * as redis from 'redis';
import { CollectedStoreInfo } from '../definitions/core';
import { IRedisAccessor, AccessResult, AccessStatus } from '../definitions/redis-accessor';

type Redis = typeof redis;

class RedisAccessor implements IRedisAccessor {
  private redis: Redis;
  private redisClient: redis.RedisClient;

  constructor(redis: Redis) {
    this.redis = redis;
    this.redisClient = this.redis.createClient();
  }

  async disconnect(): Promise<AccessResult> {
    try {
      await this.redisClient.quit();
      return Promise.resolve({ status: AccessStatus.SUCCESS });
    } catch (error) {
      return Promise.reject({
        status: AccessStatus.FAIL,
        error: error,
      });
    }
  }

  async saveStoreDetail(store: CollectedStoreInfo): Promise<AccessResult> {
    const key = store.businessRegNum;
    const value = JSON.stringify(store);

    try {
      await this.redisClient.hmset('stores', [key, value]);
      return Promise.resolve({ status: AccessStatus.SUCCESS });
    } catch (error) {
      return Promise.reject({
        status: AccessStatus.FAIL,
        error: error,
      });
    }
  }

  async getStoreDetails(): Promise<AccessResult> {
    try {
      const value = await this.redisClient.hgetall('stores');
      console.log(value);
      return Promise.resolve({ status: AccessStatus.SUCCESS });
    } catch (error) {
      return Promise.reject({
        status: AccessStatus.FAIL,
        error: error,
      });
    }
  }
}

export default RedisAccessor;
