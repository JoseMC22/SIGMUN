import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrediosUsoController } from './predios-por-uso/predios-uso.controller';
import { PrediosUsoService } from './predios-por-uso/predios-uso.service';

@Module({
  imports: [AuthModule],
  controllers: [PrediosUsoController],
  providers: [PrediosUsoService],
})
export class ReportesModule {}
