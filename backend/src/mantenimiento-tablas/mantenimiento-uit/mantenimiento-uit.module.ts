import { Module } from '@nestjs/common';
import { MantenimientoUitController } from './mantenimiento-uit.controller';
import { MantenimientoUitService } from './mantenimiento-uit.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MantenimientoUitController],
  providers: [MantenimientoUitService],
})
export class MantenimientoUitModule {}
