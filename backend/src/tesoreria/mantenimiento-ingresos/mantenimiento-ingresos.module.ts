import { Module } from '@nestjs/common';
import { MantenimientoIngresosController } from './mantenimiento-ingresos.controller';
import { MantenimientoIngresosService } from './mantenimiento-ingresos.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MantenimientoIngresosController],
  providers: [MantenimientoIngresosService],
})
export class MantenimientoIngresosModule {}
