import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReporteConstanciaExigibilidadController } from './reporte-constancia-exigibilidad.controller';
import { ReporteConstanciaExigibilidadService } from './reporte-constancia-exigibilidad.service';

@Module({
  imports: [AuthModule],
  controllers: [ReporteConstanciaExigibilidadController],
  providers: [ReporteConstanciaExigibilidadService],
})
export class ReporteConstanciaExigibilidadModule {}
