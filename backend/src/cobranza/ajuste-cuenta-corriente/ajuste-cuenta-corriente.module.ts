import { Module } from '@nestjs/common';
import { AjusteCuentaCorrienteController } from './ajuste-cuenta-corriente.controller';
import { AjusteCuentaCorrienteService } from './ajuste-cuenta-corriente.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AjusteCuentaCorrienteController],
  providers: [AjusteCuentaCorrienteService],
  exports: [AjusteCuentaCorrienteService],
})
export class AjusteCuentaCorrienteModule {}
