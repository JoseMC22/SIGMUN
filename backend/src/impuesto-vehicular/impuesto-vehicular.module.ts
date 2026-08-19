import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelosController } from './modelos/modelos.controller';
import { ModelosService } from './modelos/modelos.service';
import { ValoresController } from './valores-vehicular/valores.controller';
import { ValoresService } from './valores-vehicular/valores.service';
import { RegistroSolicitudController } from './registro-solicitud/registro-solicitud.controller';
import { RegistroSolicitudService } from './registro-solicitud/registro-solicitud.service';


@Module({
  imports: [AuthModule],
  controllers: [ModelosController, ValoresController, RegistroSolicitudController],
  providers: [ModelosService, ValoresService, RegistroSolicitudService],
})
export class ImpuestoVehicularModule {}
