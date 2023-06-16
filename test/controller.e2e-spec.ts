import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, APP_GUARD } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { ControllerModule } from './app/controllers/controller.module';
import { httPromise } from './utility/httpromise';
import { Collection, MongoClient } from 'mongodb';
import {
  mongoCollectionName,
  mongoDB,
  mongoExpireAtIndex,
  mongoURL,
} from './utility/mongo';
import { ThrottlerStorageMongoService } from '../src/throttler-storage-mongo.service';

async function dropCollectionAndCreateIndex(
  dbUrl: string,
  dbName: string,
  collectionName: string,
  indexField: string,
): Promise<void> {
  const client = new MongoClient(dbUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection: Collection = db.collection(collectionName);
    if (collection) {
      // Drop the collection
      await collection.drop();

      // Create an index on the specified field
      // await collection.createIndex({ [indexField]: 1 });
    }
  } finally {
    await client.close();
  }
}

describe.each`
  adapter                 | adapterName
  ${new ExpressAdapter()} | ${'Express'}
  ${new FastifyAdapter()} | ${'Fastify'}
`('$adapterName Throttler', ({ adapter }: { adapter: AbstractHttpAdapter }) => {
  let app: INestApplication;

  beforeAll(async () => {
    await dropCollectionAndCreateIndex(
      mongoURL,
      mongoDB,
      mongoCollectionName,
      mongoExpireAtIndex,
    );
    const config = {
      imports: [ControllerModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: ThrottlerStorage,
          useValue: new ThrottlerStorageMongoService(mongoURL),
        },
      ],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule(
      config,
    ).compile();
    app = moduleFixture.createNestApplication(adapter);
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('controllers', () => {
    let appUrl: string;
    beforeAll(async () => {
      appUrl = await app.getUrl();
    });

    /**
     * Tests for setting `@Throttle()` at the method level and for ignore routes
     */
    describe('AppController', () => {
      it('GET /ignored', async () => {
        const response = await httPromise(appUrl + '/ignored');
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /^\d+$/,
        });
      });
      it('GET /ignore-user-agents', async () => {
        const response = await httPromise(
          appUrl + '/ignore-user-agents',
          'GET',
          {
            'user-agent': 'throttler-test/0.0.0',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /^\d+$/,
        });
      });
      it('GET /', async () => {
        const response = await httPromise(appUrl + '/');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /^\d+$/,
        });
      });
    });
    /**
     * Tests for setting `@Throttle()` at the class level and overriding at the method level
     */
    describe('LimitController', () => {
      it.each`
        method   | url          | limit
        ${'GET'} | ${''}        | ${2}
        ${'GET'} | ${'/higher'} | ${5}
      `(
        '$method $url',
        async ({
          method,
          url,
          limit,
        }: {
          method: 'GET';
          url: string;
          limit: number;
        }) => {
          for (let i = 0; i < limit; i++) {
            const response = await httPromise(appUrl + '/limit' + url, method);
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit': limit.toString(),
              'x-ratelimit-remaining': (limit - (i + 1)).toString(),
              'x-ratelimit-reset': /^\d+$/,
            });
          }
          const errRes = await httPromise(appUrl + '/limit' + url, method);
          expect(errRes.data).toMatchObject({
            statusCode: 429,
            message: /ThrottlerException/,
          });
          expect(errRes.headers).toMatchObject({
            'retry-after': /^\d+$/,
          });
          expect(errRes.status).toBe(429);
        },
      );

      it('GET /flooded', async () => {
        // Try to flood an endpoint with a lot of requests and check if no
        // more than the given limit are able to bypass.
        const limit = 3;
        for (let i = 0; i < 20; i++) {
          const response = await httPromise(appUrl + '/limit/flooded', 'GET');
          if (i < limit) {
            expect(response.data).toEqual({ success: true });
            expect(
              parseInt(response.headers['x-ratelimit-reset']),
            ).toBeLessThanOrEqual(10);
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit': limit.toString(),
              'x-ratelimit-remaining': (limit - (i + 1)).toString(),
              'x-ratelimit-reset': /^\d+$/,
            });
          } else {
            expect(response.data).toMatchObject({
              statusCode: 429,
              message: /ThrottlerException/,
            });
            expect(
              parseInt(response.headers['retry-after']),
            ).toBeLessThanOrEqual(10);
            expect(response.status).toBe(429);
          }
        }
      });
    });
    /**
     * Tests for setting throttle values at the `forRoot` level
     */
    describe('DefaultController', () => {
      it('GET /default', async () => {
        const response = await httPromise(appUrl + '/default');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '4',
          'x-ratelimit-reset': /^\d+$/,
        });
      });
    });
  });
});
