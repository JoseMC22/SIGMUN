import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ConstanciaExigibilidadController } from './constancia-exigibilidad.controller';
import { ConstanciaExigibilidadService } from './constancia-exigibilidad.service';

@Module({
  imports: [AuthModule],
  controllers: [ConstanciaExigibilidadController],
  providers: [ConstanciaExigibilidadService],
})
export class ConstanciaExigibilidadModule {}
