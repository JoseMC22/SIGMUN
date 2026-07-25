import { Module } from '@nestjs/common';
import { DeterminarAlcabalaController } from './determinar-alcabala.controller';
import { DeterminarAlcabalaService } from './determinar-alcabala.service';

@Module({
  controllers: [DeterminarAlcabalaController],
  providers: [DeterminarAlcabalaService],
  exports: [DeterminarAlcabalaService],
})
export class DeterminarAlcabalaModule {}