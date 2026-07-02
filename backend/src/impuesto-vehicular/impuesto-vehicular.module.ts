import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ValoresController } from './valores-vehicular/valores.controller';
import { ValoresService } from './valores-vehicular/valores.service';

@Module({
  imports: [AuthModule],
  controllers: [ValoresController],
  providers: [ValoresService],
})
export class ImpuestoVehicularModule {}
