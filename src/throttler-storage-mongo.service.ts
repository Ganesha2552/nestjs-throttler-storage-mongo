import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  FindOneAndUpdateOptions,
  MongoClient,
  MongoClientOptions,
} from 'mongodb';
import { ThrottlerStorageMongo } from './throttler-storage-mongo.interface';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

@Injectable()
export class ThrottlerStorageMongoService
  implements ThrottlerStorageMongo, OnApplicationShutdown
{
  mongoClient: MongoClient;
  private _storage: Record<string, ThrottlerStorageRecord>;
  get storage(): Record<string, ThrottlerStorageRecord> {
    return this._storage;
  }

  constructor(url: string, mongoOptions?: MongoClientOptions) {
    this._storage = {}; // Initialize the storage (e.g., empty object)
    this.mongoClient = new MongoClient(url, mongoOptions);

    (async () => {
      try {
        await this.mongoClient.connect();
        await this.createTTLIndex();
      } catch (error) {
        console.error('Error connecting to MongoDB:', error);
      }
    })();
  }

  /**
   * Creates a TTL index on the `expireAt` field in the MongoDB collection.
   */
  private async createTTLIndex(): Promise<void> {
    await this.mongoClient
      .db()
      .collection('throttler')
      .createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Increments the request count for the specified key
   * and updates the TTL (time to live) for the key's expiration.
   * @param key The key for which to increment the request count.
   * @param ttlMilliseconds The TTL value in milliseconds for the key's expiration.
   * @returns The updated request count and time to expiration.
   */
  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    // Update the MongoDB record if the respective storage type is selected
    const ttlMilliseconds = ttl * 1000;
    const result = await this.mongoClient
      .db()
      .collection('throttler')
      .findOneAndUpdate(
        { key },
        {
          $inc: { totalHits: 1 },
          $set: { expireAt: new Date(Date.now() + ttlMilliseconds) },
        },
        {
          upsert: true,
          returnDocument: 'after',
        } as FindOneAndUpdateOptions,
      );
    const { totalHits, expireAt } = result.value;
    const timeToExpire = Math.max(
      0,
      Math.floor((expireAt.getTime() - Date.now()) / 1000),
    );

    return {
      totalHits,
      timeToExpire,
    };
  }

  /**
   * Cleans up the resources when the application shuts down.
   */
  async onApplicationShutdown() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
