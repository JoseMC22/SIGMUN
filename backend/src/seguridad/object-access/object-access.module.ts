import { Module } from '@nestjs/common';
import { ObjectAccessController } from './object-access.controller';
import { ObjectAccessService } from './object-access.service';

@Module({
  controllers: [ObjectAccessController],
  providers: [ObjectAccessService],
  exports: [ObjectAccessService],
})
export class ObjectAccessModule {}
