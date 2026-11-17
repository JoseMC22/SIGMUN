import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EstadoCuentaProyectadoController } from './estado-cuenta-proyectado.controller';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';

@Module({
  imports: [AuthModule],
  controllers: [EstadoCuentaProyectadoController],
  providers: [EstadoCuentaProyectadoService],
})
export class EstadoCuentaProyectadoModule {}
