import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListadoDeInfraccionesController } from './listado-de-infracciones/listado-de-infracciones.controller';
import { ListadoDeInfraccionesService } from './listado-de-infracciones/listado-de-infracciones.service';
import { AccionesInfraccionController } from './listado-de-infracciones/acciones-infraccion.controller';
import { AccionesInfraccionService } from './listado-de-infracciones/acciones-infraccion.service';
import { EnvioCoactivoController } from './envio-a-coactivo/envio-a-coactivo.controller';
import { EnvioCoactivoService } from './envio-a-coactivo/envio-a-coactivo.service';
import { ListadoPruebasController } from './listado-pruebas/listado-pruebas.controller';
import { ListadoPruebasService } from './listado-pruebas/listado-pruebas.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ListadoDeInfraccionesController,
    AccionesInfraccionController,
    EnvioCoactivoController,
    ListadoPruebasController,
  ],
  providers: [
    ListadoDeInfraccionesService,
    AccionesInfraccionService,
    EnvioCoactivoService,
    ListadoPruebasService,
  ],
})
export class PapeletaTransitoModule {}

