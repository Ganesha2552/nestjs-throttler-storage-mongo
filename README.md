
    Mongo storage provider for the [@nestjs/throttler](https://github.com/nestjs/throttler) package.

    
![npm version](https://img.shields.io/npm/v/nestjs-throttler-storage-mongo?style=plastic)
![npm download](https://img.shields.io/npm/dm/nestjs-throttler-storage-mongo?style=plastic)

<a href="https://www.npmjs.com/nestjs-throttler-storage-mongo"><img src="https://img.shields.io/npm/l/nestjs-throttler-storage-mongo.svg" alt="Package License" /></a>
<a href="https://coveralls.io/github/Ganesha2552/nestjs-throttler-storage-mongo?branch=main"><img src="https://coveralls.io/repos/github/Ganesha2552/nestjs-throttler-storage-mongo/badge.svg?branch=main#5" alt="Coverage" /></a>

### MongoDB Storage Provider for @nestjs/throttler

This package provides a MongoDB TTL (Time-to-Live) storage provider for the [@nestjs/throttler](https://github.com/nestjs/throttler) package
. It allows you to store rate limiter data in a MongoDB collection with automatic expiration of entries using TTL indexes.

Installation
Install the package via npm:

```bash
npm install nestjs-throttler-storage-mongo
```

Yarn

```bash
yarn add nestjs-throttler-storage-mongo
```


## Usage
To start using NestJS MongoDB Storage Provider, you need to import the ThrottlerStorageMongoService
 into your application module and configure it with your Mongo connection url and MongoClientOptions.


```ts

import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageMongoService } from 'nestjs-throttler-storage-mongo';

@Module({
imports: [
ThrottlerModule.forRoot({
ttl: 60,
limit: 5,

      // Below are possible options on how to configure the storage service.

      // connection url
      storage: new ThrottlerStorageMongoService('mongodb://'),

      // MongoDB connection string with connection options
      storage: new ThrottlerStorageMongoService('mongodb://',{
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // Other connection options
        }
      ),
    }),

],
})
export class AppModule {}

```


#Inject another config module and service:

```ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageMongoService } from 'nestjs-throttler-storage-mongo';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
        storage: new ThrottlerStorageMongoService('mongodb://'),
      }),
    }),
  ],
})
export class AppModule {}
```


##Issues

Bugs and features related to the mongo implementation are welcome in this repository.

##License

NestJS Throttler Mongo Storage is licensed under the MIT license.
