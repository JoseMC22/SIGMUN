import { Module } from '@nestjs/common';
import { CertificadoNoAdeudoController } from './certificado-no-adeudo.controller';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CertificadoNoAdeudoController],
  providers: [CertificadoNoAdeudoService],
  exports: [CertificadoNoAdeudoService],
})
export class CertificadoNoAdeudoModule {}
