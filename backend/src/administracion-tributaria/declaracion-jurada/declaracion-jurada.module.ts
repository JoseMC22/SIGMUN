import { Module } from '@nestjs/common';
import { DeclaracionJuradaController } from './declaracion-jurada.controller';
import { DeclaracionJuradaService } from './declaracion-jurada.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DeclaracionJuradaController],
  providers: [DeclaracionJuradaService],
})
export class DeclaracionJuradaModule {}
