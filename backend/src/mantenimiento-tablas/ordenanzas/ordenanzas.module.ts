import { Module } from '@nestjs/common';
import { OrdenanzasController } from './ordenanzas.controller';
import { OrdenanzasService } from './ordenanzas.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrdenanzasController],
  providers: [OrdenanzasService],
})
export class OrdenanzasModule {}
