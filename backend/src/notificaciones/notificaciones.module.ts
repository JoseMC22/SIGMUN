import { Module } from '@nestjs/common';
import { MantenimientoNotificadoresModule } from './mantenimiento-notificadores/mantenimiento-notificadores.module';

@Module({
  imports: [MantenimientoNotificadoresModule],
})
export class NotificacionesModule {}
