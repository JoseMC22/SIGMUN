import { Module } from '@nestjs/common';
import { MantenimientoViasController } from './mantenimiento-vias.controller';
import { MantenimientoViasService } from './mantenimiento-vias.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MantenimientoViasController],
  providers: [MantenimientoViasService],
})
export class MantenimientoViasModule {}
