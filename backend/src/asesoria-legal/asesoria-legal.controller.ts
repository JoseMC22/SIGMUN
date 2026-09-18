import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AsesoriaLegalService } from './asesoria-legal.service';
import { CrearSolicitudDto, ConsultarEstadoDto } from './solicitud/dto/solicitud.dto';
import { RegistrarRespuestaDto } from './respuesta/dto/respuesta.dto';

@Controller('asesoria-legal')
export class AsesoriaLegalController {
  constructor(private readonly asesoriaLegalService: AsesoriaLegalService) {}

  @Get('tramites-bomberos')
  async getTramitesBomberos(
    @Query('fFecDesde') fFecDesde?: string,
    @Query('fFecHasta') fFecHasta?: string,
    @Query('ccodigo') ccodigo?: string,
    @Query('cCodificacion') cCodificacion?: string,
    @Query('cEstadoLegal') cEstadoLegal?: string,
  ) {
    return this.asesoriaLegalService.getTramitesBomberos(fFecDesde, fFecHasta, ccodigo, cCodificacion, cEstadoLegal);
  }

  @Post('solicitud')
  async crearSolicitud(@Body() dto: CrearSolicitudDto, @Req() req: any) {
    const usuarioActual = req.user?.username || req.user?.id || 'SISTEMA';
    return this.asesoriaLegalService.crearSolicitud(dto, usuarioActual);
  }

  @Put('solicitud/:id')
  async actualizarSolicitud(
    @Param('id') id: string,
    @Body() dto: { cObservacionLegal?: string; oficinasDestino?: Array<{ cCodAreaDestino: string; cDetalleSolicitud: string }> },
  ) {
    return this.asesoriaLegalService.actualizarSolicitud(Number(id), dto.cObservacionLegal, dto.oficinasDestino);
  }

  @Get('solicitud/estado')
  async getEstadoSolicitudes(
    @Query('iCodTramite') iCodTramite?: string,
    @Query('cCodificacion') cCodificacion?: string,
    @Query('iCodOficina') iCodOficina?: string,
  ) {
    const tramiteId = iCodTramite ? Number(iCodTramite) : undefined;
    const oficinaId = iCodOficina ? Number(iCodOficina) : undefined;
    return this.asesoriaLegalService.getEstadoSolicitudes(tramiteId, cCodificacion, oficinaId);
  }

  @Post('solicitud/respuesta')
  async responderSolicitud(@Body() dto: RegistrarRespuestaDto, @Req() req: any) {
    const usuarioActual = req.user?.username || req.user?.id || 'SISTEMA';
    return this.asesoriaLegalService.responderSolicitud(
      dto.iCodSolicitudOficina,
      dto.cRespuesta,
      usuarioActual,
      dto.cNombreArchivo,
      dto.cRutaArchivo,
    );
  }

  @Put('solicitud-oficina/:id/evaluar')
  async evaluarRespuestaOficina(
    @Param('id') id: string,
    @Body() dto: { nFlgEstado: number; cNotaObservacion?: string },
  ) {
    return this.asesoriaLegalService.evaluarRespuestaOficina(
      Number(id),
      dto.nFlgEstado,
      dto.cNotaObservacion,
    );
  }

  @Get('solicitud-oficina/:id/historial')
  async getHistorialRespuestas(@Param('id') id: string) {
    return this.asesoriaLegalService.getHistorialRespuestas(Number(id));
  }
}
