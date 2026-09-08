import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnvioCoactivoService } from './envio-a-coactivo.service';
import {
  ConsultaCoactivoSchema,
  GrabarEnvioCoactivoSchema,
} from './dto/envio-a-coactivo.dto';

@Controller('papeleta-transito/envio-a-coactivo')
@UseGuards(JwtAuthGuard)
export class EnvioCoactivoController {
  constructor(private readonly service: EnvioCoactivoService) {}

  @Post('consultar')
  async consultarInfractor(@Body() body: unknown) {
    const parsed = ConsultaCoactivoSchema.parse(body);
    return this.service.consultarInfractorCoac(parsed);
  }

  @Post('buscar')
  async buscarEnvioCoactivo(@Body('ninfrac') ninfrac: string) {
    return this.service.buscarEnvioCoactivo(ninfrac);
  }

  @Post('grabar')
  async grabarEnvioCoactivo(@Request() req: any, @Body() body: unknown) {
    const parsed = GrabarEnvioCoactivoSchema.parse(body);
    const usuario = req.user?.username || 'USUARIO';
    return this.service.grabarEnvioCoactivo(parsed, usuario, 'SIGMUN-API');
  }
}
