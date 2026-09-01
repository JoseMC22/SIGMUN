import { Module } from '@nestjs/common';
import { MantenimientoNotificadoresModule } from './mantenimiento-notificadores/mantenimiento-notificadores.module';
import { ReporteCargosModule } from './reporte-cargos/reporte-cargos.module';

@Module({
  imports: [MantenimientoNotificadoresModule, ReporteCargosModule],
})
export class NotificacionesModule {}
