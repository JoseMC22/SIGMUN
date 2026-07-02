import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelosController } from './modelos/modelos.controller';
import { ModelosService } from './modelos/modelos.service';

@Module({
  imports: [AuthModule],
  controllers: [ModelosController],
  providers: [ModelosService],
})
export class ImpuestoVehicularModule {}
