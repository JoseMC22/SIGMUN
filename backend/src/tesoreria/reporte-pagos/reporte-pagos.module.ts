import { Module } from '@nestjs/common';
import { ReportePagosController } from './reporte-pagos.controller';
import { ReportePagosService } from './reporte-pagos.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportePagosController],
  providers: [ReportePagosService],
})
export class ReportePagosModule {}
