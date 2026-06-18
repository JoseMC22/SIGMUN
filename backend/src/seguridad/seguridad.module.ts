import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuariosController } from './usuarios/usuarios.controller';
import { UsuariosService } from './usuarios/usuarios.service';
import { PerfilesController } from './perfiles/perfiles.controller';
import { PerfilesService } from './perfiles/perfiles.service';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController, PerfilesController],
  providers: [UsuariosService, PerfilesService],
})
export class SeguridadModule {}
