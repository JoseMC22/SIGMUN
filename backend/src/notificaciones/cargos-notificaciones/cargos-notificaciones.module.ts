import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CargosNotificacionesController } from './cargos-notificaciones.controller';
import { CargosNotificacionesService } from './cargos-notificaciones.service';

@Module({
  imports: [AuthModule],
  controllers: [CargosNotificacionesController],
  providers: [CargosNotificacionesService],
})
export class CargosNotificacionesModule {}
