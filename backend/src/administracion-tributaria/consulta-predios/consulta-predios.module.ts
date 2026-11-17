import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ConsultaPrediosController } from './consulta-predios.controller';
import { ConsultaPrediosService } from './consulta-predios.service';

@Module({
  imports: [AuthModule],
  controllers: [ConsultaPrediosController],
  providers: [ConsultaPrediosService],
})
export class ConsultaPrediosModule {}
