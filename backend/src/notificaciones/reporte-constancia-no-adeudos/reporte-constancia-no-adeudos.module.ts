import { Module } from '@nestjs/common';
import { ReporteConstanciaNoAdeudosController } from './reporte-constancia-no-adeudos.controller';
import { ReporteConstanciaNoAdeudosService } from './reporte-constancia-no-adeudos.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteConstanciaNoAdeudosController],
  providers: [ReporteConstanciaNoAdeudosService],
  exports: [ReporteConstanciaNoAdeudosService],
})
export class ReporteConstanciaNoAdeudosModule {}
