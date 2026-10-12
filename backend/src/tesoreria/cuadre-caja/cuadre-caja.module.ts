import { Module } from '@nestjs/common';
import { CuadreCajaController } from './cuadre-caja.controller';
import { CuadreCajaService } from './cuadre-caja.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CuadreCajaController],
  providers: [CuadreCajaService],
})
export class CuadreCajaModule {}
