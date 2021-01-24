export interface IRedisAccessor {
  saveTotalCount(): void;
  saveStoreDetail(): void;
  getStoreDetails(): void;
}
