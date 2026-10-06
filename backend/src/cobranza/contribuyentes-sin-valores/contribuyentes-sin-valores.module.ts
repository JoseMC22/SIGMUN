import { Module } from '@nestjs/common';
import { ContribuyentesSinValoresController } from './contribuyentes-sin-valores.controller';
import { ContribuyentesSinValoresService } from './contribuyentes-sin-valores.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContribuyentesSinValoresController],
  providers: [ContribuyentesSinValoresService],
})
export class ContribuyentesSinValoresModule {}
