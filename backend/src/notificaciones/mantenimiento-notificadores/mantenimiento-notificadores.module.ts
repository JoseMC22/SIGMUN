import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { MantenimientoNotificadoresController } from './mantenimiento-notificadores.controller';
import { MantenimientoNotificadoresService } from './mantenimiento-notificadores.service';

@Module({
  imports: [AuthModule],
  controllers: [MantenimientoNotificadoresController],
  providers: [MantenimientoNotificadoresService],
})
export class MantenimientoNotificadoresModule {}
