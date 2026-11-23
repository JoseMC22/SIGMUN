import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ValoresUnitariosController } from './valores-unitarios.controller';
import { ValoresUnitariosService } from './valores-unitarios.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ValoresUnitariosController],
  providers: [ValoresUnitariosService],
  exports: [ValoresUnitariosService],
})
export class ValoresUnitariosModule {}
