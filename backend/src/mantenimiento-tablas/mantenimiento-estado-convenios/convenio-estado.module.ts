import { Module } from '@nestjs/common';
import { ConvenioEstadoController } from './convenio-estado.controller';
import { ConvenioEstadoService } from './convenio-estado.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ConvenioEstadoController],
  providers: [ConvenioEstadoService],
  exports: [ConvenioEstadoService],
})
export class ConvenioEstadoModule {}