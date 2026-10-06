import { Module } from '@nestjs/common';
import { ConsultaValoresController } from './consulta-valores.controller';
import { ConsultaValoresService } from './consulta-valores.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ConsultaValoresController],
  providers: [ConsultaValoresService],
  exports: [ConsultaValoresService],
})
export class ConsultaValoresModule {}
