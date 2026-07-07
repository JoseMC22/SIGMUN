import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RegistroSolicitudService } from './registro-solicitud.service';
import {
  SearchRegistroSolicitudSchema,
  SearchRegistroSolicitudDto,
} from './dto/search-registro-solicitud.dto';
import {
  SaveRegistroSolicitudSchema,
  SaveRegistroSolicitudDto,
} from './dto/save-registro-solicitud.dto';
import {
  ContribuyenteRow,
  PaginatedResponse,
  TipoContribuyente,
  SubtipoContribuyente,
  MotivoActualizacion,
  TipoInterior,
  TipoEdificacion,
  TipoIngreso,
  TipoAgrupamiento,
  DocumentoOption,
  DistritoOption,
  TipoViaOption,
  SolicitudRow,
  SolicitudDetail,
  DjRow,
  RepresentanteRow,
  TipoRelacion,
} from './dto/registro-solicitud.types';
import {
  SaveRepresentanteSchema,
  SaveRepresentanteDto,
} from './dto/save-representante.dto';

@Controller('impuesto-vehicular/registro-solicitud')
@UseGuards(JwtAuthGuard)
export class RegistroSolicitudController {
  constructor(
    private readonly registroSolicitudService: RegistroSolicitudService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchRegistroSolicitudDto,
  ): Promise<PaginatedResponse<ContribuyenteRow>> {
    const parsed = SearchRegistroSolicitudSchema.parse(dto);
    return this.registroSolicitudService.search(parsed);
  }


  @Post('save')
  async save(
    @Body() dto: SaveRegistroSolicitudDto,
    @Req() req: any,
  ) {
    const parsed = SaveRegistroSolicitudSchema.parse(dto);
    const operador = req.user.sub;
    const estacion = req.headers?.host || req.ip || 'unknown';
    return this.registroSolicitudService.save(parsed, operador, estacion);
  }

  @Delete(':codigo')
  async eliminar(
    @Param('codigo') codigo: string,
    @Body() body: { motivo: string },
    @Req() req: any,
  ) {
    const operador = req.user.sub;
    return this.registroSolicitudService.eliminar(codigo, body.motivo, operador);
  }

  @Get('validar-dni/:numDoc')
  async validateDni(@Param('numDoc') numDoc: string) {
    return this.registroSolicitudService.validateDni(numDoc);
  }

  @Get('catalogos/tipos-contribuyente')
  async getTiposContribuyente(): Promise<{ data: TipoContribuyente[] }> {
    const data = await this.registroSolicitudService.getTiposContribuyente();
    return { data };
  }

  @Get('catalogos/subtipos-contribuyente/:idTipo')
  async getSubtiposContribuyente(
    @Param('idTipo') idTipo: string,
  ): Promise<{ data: SubtipoContribuyente[] }> {
    const data = await this.registroSolicitudService.getSubtiposContribuyente(idTipo);
    return { data };
  }

  @Get('catalogos/motivos-actualizacion')
  async getMotivosActualizacion(): Promise<{ data: MotivoActualizacion[] }> {
    const data = await this.registroSolicitudService.getMotivosActualizacion();
    return { data };
  }

  @Get('catalogos/tipos-interior')
  async getTiposInterior(): Promise<{ data: TipoInterior[] }> {
    const data = await this.registroSolicitudService.getTiposInterior();
    return { data };
  }

  @Get('catalogos/tipos-edificacion')
  async getTiposEdificacion(): Promise<{ data: TipoEdificacion[] }> {
    const data = await this.registroSolicitudService.getTiposEdificacion();
    return { data };
  }

  @Get('catalogos/tipos-ingreso')
  async getTiposIngreso(): Promise<{ data: TipoIngreso[] }> {
    const data = await this.registroSolicitudService.getTiposIngreso();
    return { data };
  }

  @Get('catalogos/tipos-agrupamiento')
  async getTiposAgrupamiento(): Promise<{ data: TipoAgrupamiento[] }> {
    const data = await this.registroSolicitudService.getTiposAgrupamiento();
    return { data };
  }

  @Get('catalogos/documentos')
  async getDocumentos(): Promise<{ data: DocumentoOption[] }> {
    const data = await this.registroSolicitudService.getDocumentos();
    return { data };
  }

  @Get('catalogos/distritos')
  async getDistritos(): Promise<{ data: DistritoOption[] }> {
    const data = await this.registroSolicitudService.getDistritos();
    return { data };
  }

  @Get('catalogos/vias')
  async getVias(): Promise<{ data: TipoViaOption[] }> {
    const data = await this.registroSolicitudService.getVias();
    return { data };
  }

  @Get('catalogos/urbanizaciones/:idUrba')
  async getUrbanizaciones(@Param('idUrba') idUrba: string) {
    const data = await this.registroSolicitudService.getUrbanizaciones(idUrba);
    return { data };
  }

  @Get('catalogos/search-vias')
  async searchVias(@Query('query') query: string) {
    const data = await this.registroSolicitudService.searchVias(query);
    return { data };
  }

  @Get('solicitudes/:codigo')
  async getSolicitudesByContribuyente(
    @Param('codigo') codigo: string,
    @Query('id_solicitud') idSolicitud: string = '',
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '15',
  ): Promise<{ data: SolicitudRow[]; total: number }> {
    return this.registroSolicitudService.getSolicitudesByContribuyente(
      codigo,
      idSolicitud,
      Number(page),
      Number(pageSize),
    );
  }

  @Get('solicitud-detail/:codigo')
  async getSolicitudDetail(
    @Param('codigo') codigo: string,
    @Query('id_solicitud') idSolicitud: string,
  ): Promise<{ data: SolicitudDetail }> {
    const data = await this.registroSolicitudService.getSolicitudDetail(codigo, idSolicitud || undefined);
    return { data };
  }

  @Post('solicitud/save')
  async saveSolicitud(
    @Body() body: {
      codigo: string;
      id_solicitud?: string;
      petitorio: string;
      hecho: string;
      derecho: string;
      num_recibo: string;
      fecha_recibo: string;
      anio: string;
    },
    @Req() req: any,
  ): Promise<{ success: boolean; idSolicitud?: string }> {
    const operador = req.user?.username ?? 'SISTEMA';
    const estacion = req.hostname ?? 'WEB';
    return this.registroSolicitudService.saveSolicitud(
      body.codigo,
      body.id_solicitud ?? null,
      body,
      operador,
      estacion,
    );
  }

  @Get('dj-listado/:codigo')
  async getDJListado(
    @Param('codigo') codigo: string,
    @Query('id_solicitud') idSolicitud: string,
    @Query('criterio') criterio: string = '',
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '15',
  ): Promise<{ data: DjRow[]; total: number }> {
    return this.registroSolicitudService.getDJListado(
      codigo,
      idSolicitud,
      criterio,
      Number(page),
      Number(pageSize),
    );
  }

  @Delete('solicitud/:id')
  async deleteSolicitud(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string }> {
    const operador = req.user?.username ?? 'SISTEMA';
    const estacion = req.hostname ?? 'WEB';
    return this.registroSolicitudService.deleteSolicitud(id, operador, estacion);
  }

  @Get('dj-combos')
  async getDJCombos(): Promise<{
    propiedades: { id: string; nombre: string }[];
    idAnio: string;
    tasa: string;
    idTasa: string;
    numDecla: string;
  }> {
    return this.registroSolicitudService.getDJCombos();
  }

  @Post('dj/save')
  async saveDJ(
    @Body() body: any,
    @Req() req: any,
  ): Promise<{ success: boolean; result?: string }> {
    const operador = req.user?.username ?? 'SISTEMA';
    const estacion = req.hostname ?? 'WEB';
    return this.registroSolicitudService.saveDJ({ ...body, operador, estacion });
  }

  // ──────────────────────────────────────────────
  // Representante endpoints
  // ──────────────────────────────────────────────

  @Get('representante/contribuyente/:codigo')
  async getRepresentantesByContribuyente(@Param('codigo') codigo: string): Promise<{ data: RepresentanteRow[] }> {
    const data = await this.registroSolicitudService.getRepresentantesByContribuyente(codigo);
    return { data };
  }

  @Get('representante/verificar/:codigo')
  async verificarRepresentante(@Param('codigo') codigo: string) {
    return this.registroSolicitudService.verificarRepresentante(codigo);
  }

  @Get('representante/:id')
  async getRepresentanteById(@Param('id') id: string) {
    const data = await this.registroSolicitudService.getRepresentanteById(id);
    return { data };
  }

  @Post('representante')
  async createRepresentante(@Body() dto: SaveRepresentanteDto, @Req() req: any) {
    const parsed = SaveRepresentanteSchema.parse(dto);
    const operador = req.user.sub;
    const estacion = req.headers?.host || req.ip || 'unknown';
    return this.registroSolicitudService.createRepresentante(parsed, operador, estacion);
  }

  @Put('representante/:id')
  async updateRepresentante(
    @Param('id') id: string,
    @Body() dto: SaveRepresentanteDto,
    @Req() req: any,
  ) {
    const parsed = SaveRepresentanteSchema.parse(dto);
    const operador = req.user.sub;
    const estacion = req.headers?.host || req.ip || 'unknown';
    return this.registroSolicitudService.updateRepresentante(id, parsed, operador, estacion);
  }

  @Delete('representante/:id')
  async deleteRepresentante(
    @Param('id') id: string,
    @Body() body: { codigo: string },
    @Req() req: any,
  ) {
    const operador = req.user.sub;
    return this.registroSolicitudService.deleteRepresentante(id, body.codigo, operador);
  }

  @Get('catalogos/tipos-relacion')
  async getTiposRelacion(): Promise<{ data: TipoRelacion[] }> {
    const data = await this.registroSolicitudService.getTiposRelacion();
    return { data };
  }

  // NOTE: this generic route MUST be last — it catches any single-segment GET
  @Get(':codigo')
  async getById(@Param('codigo') codigo: string) {
    const data = await this.registroSolicitudService.getById(codigo);
    return { data };
  }
}
