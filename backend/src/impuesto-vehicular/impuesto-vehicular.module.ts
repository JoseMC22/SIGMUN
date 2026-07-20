import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RegistroSolicitudController } from './registro-solicitud/registro-solicitud.controller';
import { RegistroSolicitudService } from './registro-solicitud/registro-solicitud.service';

@Module({
  imports: [AuthModule],
  controllers: [RegistroSolicitudController],
  providers: [RegistroSolicitudService],
})
export class ImpuestoVehicularModule {}
