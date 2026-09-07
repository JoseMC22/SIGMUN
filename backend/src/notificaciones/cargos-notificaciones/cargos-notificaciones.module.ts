import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ObjectAccessModule } from '../../seguridad/object-access/object-access.module';
import { CargosNotificacionesController } from './cargos-notificaciones.controller';
import { CargosNotificacionesService } from './cargos-notificaciones.service';

@Module({
  imports: [AuthModule, ObjectAccessModule],
  controllers: [CargosNotificacionesController],
  providers: [CargosNotificacionesService],
})
export class CargosNotificacionesModule {}
