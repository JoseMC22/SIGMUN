import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EstadoCuentaProyectadoController } from './estado-cuenta-proyectado.controller';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';
import { EstadoCuentaProyectadoDetalleService } from './estado-cuenta-proyectado-detalle.service';

@Module({
  imports: [AuthModule],
  controllers: [EstadoCuentaProyectadoController],
  providers: [
    EstadoCuentaProyectadoService,
    EstadoCuentaProyectadoDetalleService,
  ],
})
export class EstadoCuentaProyectadoModule {}
