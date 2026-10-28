import { Module } from '@nestjs/common';
import { GenerarOpController } from './generar-op.controller';
import { GenerarOpService } from './generar-op.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GenerarOpController],
  providers: [GenerarOpService],
  exports: [GenerarOpService],
})
export class GenerarOpModule {}
