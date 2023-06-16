import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { MongoClient } from 'mongodb';

export interface ThrottlerStorageMongo {
  /**
   * The mongo instance.
   */
  mongoClient: MongoClient;

  /**
   * Increment the amount of requests for a given record. The record will
   * automatically be removed from the storage once its TTL has been reached.
   */
  increment(key: string, ttl: number): Promise<ThrottlerStorageRecord>;
}

export const ThrottlerStorageMongo = Symbol('ThrottlerStorageMongo');
