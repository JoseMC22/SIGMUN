import { Module } from '@nestjs/common';
import { PrediosContribuyentesController } from './predios-contribuyentes.controller';
import { PrediosContribuyentesService } from './predios-contribuyentes.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PrediosContribuyentesController],
  providers: [PrediosContribuyentesService],
})
export class PrediosContribuyentesModule {}