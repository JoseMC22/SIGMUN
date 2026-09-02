import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListadoDeInfraccionesController } from './listado-de-infracciones/listado-de-infracciones.controller';
import { ListadoDeInfraccionesService } from './listado-de-infracciones/listado-de-infracciones.service';
import { AccionesInfraccionController } from './listado-de-infracciones/acciones-infraccion.controller';
import { AccionesInfraccionService } from './listado-de-infracciones/acciones-infraccion.service';
import { EnvioCoactivoController } from './envio-a-coactivo/envio-a-coactivo.controller';
import { EnvioCoactivoService } from './envio-a-coactivo/envio-a-coactivo.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ListadoDeInfraccionesController,
    AccionesInfraccionController,
    EnvioCoactivoController,
  ],
  providers: [
    ListadoDeInfraccionesService,
    AccionesInfraccionService,
    EnvioCoactivoService,
  ],
})
export class PapeletaTransitoModule {}
