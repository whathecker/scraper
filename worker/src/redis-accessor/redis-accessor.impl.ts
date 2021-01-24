/* eslint-disable @typescript-eslint/no-unused-vars */
import redis from 'redis';
import { IRedisAccessor } from '../definitions/redis-accessor';

type Redis = typeof redis;

class RedisAccessor implements IRedisAccessor {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  saveTotalCount(): void {
    console.log(this.redis);
  }

  saveStoreDetail(): void {
    console.log(this.redis);
  }

  getStoreDetails(): void {
    console.log(this.redis);
  }
}

export default RedisAccessor;
