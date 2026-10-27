import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReporteIngresosCajeroController } from './reporte-ingresos-cajero.controller';
import { ReporteIngresosCajeroService } from './reporte-ingresos-cajero.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteIngresosCajeroController],
  providers: [ReporteIngresosCajeroService],
  exports: [ReporteIngresosCajeroService],
})
export class ReporteIngresosCajeroModule {}
