import { CollectedStoreInfo } from './core';

export enum AccessStatus {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

export type AccessResult = {
  status: AccessStatus;
  error?: Error;
  data?: CollectedStoreInfo | CollectedStoreInfo[];
};

export interface IRedisAccessor {
  saveStoreDetail(store: CollectedStoreInfo): Promise<AccessResult>;
  getStoreDetails(): Promise<AccessResult>;
  disconnect(): Promise<AccessResult>;
}
