import { Module } from '@nestjs/common';
import { AnularValorController } from './anular-valor.controller';
import { AnularValorService } from './anular-valor.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AnularValorController],
  providers: [AnularValorService],
  exports: [AnularValorService],
})
export class AnularValorModule {}
