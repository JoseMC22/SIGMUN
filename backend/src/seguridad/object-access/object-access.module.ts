import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ObjectAccessController } from './object-access.controller';
import { ObjectAccessService } from './object-access.service';
import { ObjectAccessSubscriber } from './object-access.subscriber';

function createRedisClient(config: ConfigService): Redis {
  const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
  return new Redis(url, { maxRetriesPerRequest: 3 });
}

@Module({
  imports: [ConfigModule],
  controllers: [ObjectAccessController],
  providers: [
    ObjectAccessService,
    ObjectAccessSubscriber,
    {
      provide: 'REDIS_PUB_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    {
      provide: 'REDIS_SUB_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    {
      provide: ObjectAccessSubscriber,
      inject: ['REDIS_SUB_CLIENT'],
      useFactory: (redis: Redis) => new ObjectAccessSubscriber(() => redis),
    },
  ],
  exports: [ObjectAccessService],
})
export class ObjectAccessModule {}
