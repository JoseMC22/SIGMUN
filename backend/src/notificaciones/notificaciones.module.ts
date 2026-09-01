import { Module } from '@nestjs/common';
import { MantenimientoNotificadoresModule } from './mantenimiento-notificadores/mantenimiento-notificadores.module';
import { ReporteConstanciaExigibilidadModule } from './reporte-constancia-exigibilidad/reporte-constancia-exigibilidad.module';

@Module({
  imports: [MantenimientoNotificadoresModule, ReporteConstanciaExigibilidadModule],
})
export class NotificacionesModule {}
