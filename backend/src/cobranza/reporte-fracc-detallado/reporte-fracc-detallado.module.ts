import { Module } from '@nestjs/common';
import { ReporteFraccDetalladoController } from './reporte-fracc-detallado.controller';
import { ReporteFraccDetalladoService } from './reporte-fracc-detallado.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteFraccDetalladoController],
  providers: [ReporteFraccDetalladoService],
  exports: [ReporteFraccDetalladoService],
})
export class ReporteFraccDetalladoModule {}
