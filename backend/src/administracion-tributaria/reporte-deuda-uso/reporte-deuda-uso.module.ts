import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReporteDeudaUsoController } from './reporte-deuda-uso.controller';
import { ReporteDeudaUsoService } from './reporte-deuda-uso.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReporteDeudaUsoController],
  providers: [ReporteDeudaUsoService],
  exports: [ReporteDeudaUsoService],
})
export class ReporteDeudaUsoModule {}
