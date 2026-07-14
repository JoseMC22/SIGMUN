import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartasRequerimientoController } from './cartas-requerimiento/cartas-requerimiento.controller';
import { CartasRequerimientoService } from './cartas-requerimiento/cartas-requerimiento.service';

@Module({
  imports: [AuthModule],
  controllers: [CartasRequerimientoController],
  providers: [CartasRequerimientoService],
})
export class FiscalizacionTributariaModule {}
