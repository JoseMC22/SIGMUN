import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListadoDeInfraccionesController } from './listado-de-infracciones.controller';
import { ListadoDeInfraccionesService } from './listado-de-infracciones.service';
import { AccionesInfraccionController } from './acciones-infraccion.controller';
import { AccionesInfraccionService } from './acciones-infraccion.service';

@Module({
  imports: [AuthModule],
  controllers: [ListadoDeInfraccionesController, AccionesInfraccionController],
  providers: [ListadoDeInfraccionesService, AccionesInfraccionService],
})
export class PapeletaTransitoModule {}
