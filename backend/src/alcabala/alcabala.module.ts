import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsultaRdAlcabalaController } from './consulta-rd-alcabala/consulta-rd-alcabala.controller';
import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala/consulta-rd-alcabala.service';
import { RdAlcabalaController } from './rd-alcabala/rd-alcabala.controller';
import { RdAlcabalaService } from './rd-alcabala/rd-alcabala.service';
import { ReporteDeAlcabalaModule } from './reporte-de-alcabala/reporte-de-alcabala.module';
import { DeterminarAlcabalaModule } from './determinar-alcabala/determinar-alcabala.module';

@Module({
  imports: [AuthModule, ReporteDeAlcabalaModule, DeterminarAlcabalaModule],
  controllers: [ConsultaRdAlcabalaController, RdAlcabalaController],
  providers: [ConsultaRdAlcabalaService, RdAlcabalaService],
})
export class AlcabalaModule {}
