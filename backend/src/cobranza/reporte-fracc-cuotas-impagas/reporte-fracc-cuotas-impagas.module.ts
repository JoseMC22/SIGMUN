import { Module } from '@nestjs/common';
import { ReporteFraccCuotasImpagasController } from './reporte-fracc-cuotas-impagas.controller';
import { ReporteFraccCuotasImpagasService } from './reporte-fracc-cuotas-impagas.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteFraccCuotasImpagasController],
  providers: [ReporteFraccCuotasImpagasService],
  exports: [ReporteFraccCuotasImpagasService],
})
export class ReporteFraccCuotasImpagasModule {}