import { Module } from '@nestjs/common';
import { MultaTributariaController } from './multa-tributaria.controller';
import { MultaTributariaService } from './multa-tributaria.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MultaTributariaController],
  providers: [MultaTributariaService],
  exports: [MultaTributariaService],
})
export class MultaTributariaModule {}
