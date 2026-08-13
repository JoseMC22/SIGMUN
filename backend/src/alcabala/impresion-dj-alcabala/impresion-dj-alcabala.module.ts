import { Module } from '@nestjs/common';
import { ImpresionDjAlcabalaController } from './impresion-dj-alcabala.controller';
import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';

@Module({
  controllers: [ImpresionDjAlcabalaController],
  providers: [ImpresionDjAlcabalaService],
  exports: [ImpresionDjAlcabalaService],
})
export class ImpresionDjAlcabalaModule {}
