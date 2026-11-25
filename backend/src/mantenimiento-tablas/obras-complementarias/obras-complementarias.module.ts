import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ObrasComplementariasController } from './obras-complementarias.controller';
import { ObrasComplementariasService } from './obras-complementarias.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ObrasComplementariasController],
  providers: [ObrasComplementariasService],
  exports: [ObrasComplementariasService],
})
export class ObrasComplementariasModule {}
