import { Module } from '@nestjs/common';
import { ReporteConstanciaNoAdeudoController } from './reporte-constancia-no-adeudo.controller';
import { ReporteConstanciaNoAdeudoService } from './reporte-constancia-no-adeudo.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteConstanciaNoAdeudoController],
  providers: [ReporteConstanciaNoAdeudoService],
  exports: [ReporteConstanciaNoAdeudoService],
})
export class ReporteConstanciaNoAdeudoModule {}