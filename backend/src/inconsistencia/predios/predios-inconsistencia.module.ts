import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrediosInconsistenciaController } from './predios-inconsistencia.controller';
import { PrediosInconsistenciaService } from './predios-inconsistencia.service';

@Module({
  imports: [AuthModule],
  controllers: [PrediosInconsistenciaController],
  providers: [PrediosInconsistenciaService],
})
export class PrediosInconsistenciaModule {}
