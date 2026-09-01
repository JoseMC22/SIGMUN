import { Module } from '@nestjs/common';
import { MantenimientoNotificadoresModule } from './mantenimiento-notificadores/mantenimiento-notificadores.module';
import { ReporteCargosModule } from './reporte-cargos/reporte-cargos.module';
import { ReporteConstanciaExigibilidadModule } from './reporte-constancia-exigibilidad/reporte-constancia-exigibilidad.module';

@Module({
  imports: [
    MantenimientoNotificadoresModule,
    ReporteCargosModule,
    ReporteConstanciaExigibilidadModule,
  ],
})
export class NotificacionesModule {}
