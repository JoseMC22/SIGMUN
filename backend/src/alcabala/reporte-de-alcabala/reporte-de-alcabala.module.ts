import { Module } from '@nestjs/common';
import { ReporteDeAlcabalaController } from './reporte-de-alcabala.controller';
import { ReporteDeAlcabalaService } from './reporte-de-alcabala.service';

@Module({
  controllers: [ReporteDeAlcabalaController],
  providers: [ReporteDeAlcabalaService],
  exports: [ReporteDeAlcabalaService],
})
export class ReporteDeAlcabalaModule {}