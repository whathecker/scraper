import * as redis from 'redis';
import { promisify } from 'util';
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
    const hGetAllAsync = promisify(this.redisClient.hgetall).bind(this.redisClient);
    try {
      const values = await hGetAllAsync('stores');
      return Promise.resolve({
        status: AccessStatus.SUCCESS,
        data: this.parseRedisData(values),
      });
    } catch (error) {
      return Promise.reject({
        status: AccessStatus.FAIL,
        error: error,
      });
    }
  }

  async deleteStoreDetails(): Promise<AccessResult> {
    try {
      await this.redisClient.flushall();
      return Promise.resolve({
        status: AccessStatus.SUCCESS,
      });
    } catch (error) {
      return Promise.reject({
        status: AccessStatus.FAIL,
      });
    }
  }

  private parseRedisData(data: Record<string, string>): CollectedStoreInfo[] {
    const result = [];
    for (const element in data) {
      const jsonData = JSON.parse(data[element]);
      result.push(jsonData);
    }
    return result;
  }
}

export default RedisAccessor;
