import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsultaRdAlcabalaController } from './consulta-rd-alcabala/consulta-rd-alcabala.controller';
import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala/consulta-rd-alcabala.service';

@Module({
  imports: [AuthModule],
  controllers: [ConsultaRdAlcabalaController],
  providers: [ConsultaRdAlcabalaService],
})
export class AlcabalaModule {}
