import { Module } from '@nestjs/common';
import { MaestroContribuyentesController } from './maestro-contribuyentes.controller';
import { MaestroContribuyentesService } from './maestro-contribuyentes.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MaestroContribuyentesController],
  providers: [MaestroContribuyentesService],
})
export class MaestroContribuyentesModule {}