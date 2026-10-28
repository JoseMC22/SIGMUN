import { Module } from '@nestjs/common';
import { ComparaLiquidacionController } from './compara-liquidacion.controller';
import { ComparaLiquidacionService } from './compara-liquidacion.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ComparaLiquidacionController],
  providers: [ComparaLiquidacionService],
})
export class ComparaLiquidacionModule {}
