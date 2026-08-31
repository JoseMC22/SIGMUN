import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReporteCargosController } from './reporte-cargos.controller';
import { ReporteCargosService } from './reporte-cargos.service';

@Module({
  imports: [AuthModule],
  controllers: [ReporteCargosController],
  providers: [ReporteCargosService],
})
export class ReporteCargosModule {}
