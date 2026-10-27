import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReporteIngresosGerenciaController } from './reporte-ingresos-gerencia.controller';
import { ReporteIngresosGerenciaService } from './reporte-ingresos-gerencia.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteIngresosGerenciaController],
  providers: [ReporteIngresosGerenciaService],
  exports: [ReporteIngresosGerenciaService],
})
export class ReporteIngresosGerenciaModule {}
