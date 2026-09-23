import { Module } from '@nestjs/common';
import { PrediosInconsistenciaModule } from './predios/predios-inconsistencia.module';

@Module({
  imports: [PrediosInconsistenciaModule],
})
export class InconsistenciaModule {}
