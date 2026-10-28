import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReporteInafectosController } from './reporte-inafectos.controller';
import { ReporteInafectosService } from './reporte-inafectos.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteInafectosController],
  providers: [ReporteInafectosService],
  exports: [ReporteInafectosService],
})
export class ReporteInafectosModule {}
