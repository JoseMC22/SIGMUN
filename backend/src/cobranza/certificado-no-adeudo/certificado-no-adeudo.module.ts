import { Module } from '@nestjs/common';
import { CertificadoNoAdeudoController } from './certificado-no-adeudo.controller';
import { CertificadoPublicoController } from './certificado-publico.controller';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CertificadoNoAdeudoController, CertificadoPublicoController],
  providers: [CertificadoNoAdeudoService],
  exports: [CertificadoNoAdeudoService],
})
export class CertificadoNoAdeudoModule {}
