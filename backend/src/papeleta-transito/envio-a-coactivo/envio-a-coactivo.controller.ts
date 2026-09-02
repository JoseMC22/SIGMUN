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
    console.log('📥 [Backend Controller] POST /papeleta-transito/envio-a-coactivo/consultar Body:', body);
    const parsed = ConsultaCoactivoSchema.parse(body);
    return this.service.consultarInfractorCoac(parsed);
  }

  @Post('buscar')
  async buscarEnvioCoactivo(@Body('ninfrac') ninfrac: string) {
    console.log('📥 [Backend Controller] POST /papeleta-transito/envio-a-coactivo/buscar ninfrac:', ninfrac);
    return this.service.buscarEnvioCoactivo(ninfrac);
  }

  @Post('grabar')
  async grabarEnvioCoactivo(@Request() req: any, @Body() body: unknown) {
    console.log('📥 [Backend Controller] POST /papeleta-transito/envio-a-coactivo/grabar Body:', body);
    const parsed = GrabarEnvioCoactivoSchema.parse(body);
    const usuario = req.user?.username || 'USUARIO';
    return this.service.grabarEnvioCoactivo(parsed, usuario, 'SIGMUN-API');
  }
}
