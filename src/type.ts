import { ThrottlerStorageMongo } from './throttler-storage-mongo.interface';

export type Type<T extends ThrottlerStorageMongo> = { new (...args: any[]): T };
