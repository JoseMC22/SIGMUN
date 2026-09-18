import { Module } from '@nestjs/common';
import { AsesoriaLegalController } from './asesoria-legal.controller';
import { AsesoriaLegalService } from './asesoria-legal.service';

@Module({
  controllers: [AsesoriaLegalController],
  providers: [AsesoriaLegalService],
  exports: [AsesoriaLegalService],
})
export class AsesoriaLegalModule {}
