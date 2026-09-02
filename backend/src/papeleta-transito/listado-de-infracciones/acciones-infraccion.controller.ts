import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccionesInfraccionService } from './acciones-infraccion.service';
import {
  NuevaInfraccionSchema,
  NuevaInfraccionDto,
  GenerarGravamenSchema,
  GenerarGravamenDto,
  GenerarNoAdeudoSchema,
  GenerarNoAdeudoDto,
  ImprimirRecordPendienteSchema,
  ImprimirRecordPendienteDto,
  FraccionarPapeletaSchema,
  FraccionarPapeletaDto,
  VerFraccionamientoSchema,
  VerFraccionamientoDto,
  ImportarExcelSchema,
  ImportarExcelDto,
  CargarDetalleInfraccionSchema,
  CargarDetalleInfraccionDto,
  BuscarResolucionSancionSchema,
  BuscarResolucionSancionDto,
  GrabarResolucionSancionSchema,
  GrabarResolucionSancionDto,
  BuscarCambioEstadoSchema,
  BuscarCambioEstadoDto,
  GrabarCambioEstadoSchema,
  GrabarCambioEstadoDto,
  GenerarLiquidacionSchema,
  GenerarLiquidacionDto,
  ConsultaPropietarioSchema,
  ConsultaConductorSchema,
  ConsultaPlacaSchema,
  ConsultaPoliciaSchema,
  ConsultaLugarSchema,
  GravamenSinPlacaSchema,
  GravamenSinPlacaDto,
  BuscarEnvioCoactivoSchema,
  BuscarEnvioCoactivoDto,
  GrabarEnvioCoactivoSchema,
  GrabarEnvioCoactivoDto,
  ConsultaInfraccionesSchema,
  ReporteEstadoCuentaSchema,
  ReporteEstadoCuentaDto,
  ReporteCertificadoNoAdeudoSchema,
  ReporteCertificadoNoAdeudoDto,
  ReporteGravamenSchema,
  ReporteGravamenDto,
  ReporteResolucionSancionSchema,
  ReporteResolucionSancionDto,
} from './dto/acciones-infraccion.dto';

@Controller('papeleta-transito/acciones')
@UseGuards(JwtAuthGuard)
export class AccionesInfraccionController {
  constructor(
    private readonly accionesService: AccionesInfraccionService,
  ) {}

  @Post('nueva-infraccion')
  async nuevaInfraccion(@Request() req: any, @Body() dto: NuevaInfraccionDto) {
    const parsed = NuevaInfraccionSchema.parse(dto);
    const usuario = req.user?.username || 'JMOZO';
    return this.accionesService.nuevaInfraccion(parsed, usuario);
  }

  @Post('generar-gravamen')
  async generarGravamen(@Body() dto: GenerarGravamenDto) {
    const parsed = GenerarGravamenSchema.parse(dto);
    return this.accionesService.generarGravamen(parsed);
  }

  @Post('generar-no-adeudo')
  async generarNoAdeudo(@Body() dto: GenerarNoAdeudoDto) {
    const parsed = GenerarNoAdeudoSchema.parse(dto);
    return this.accionesService.generarNoAdeudo(parsed);
  }

  @Post('gravamen-sin-placa')
  async gravamenSinPlaca(@Body() dto: GravamenSinPlacaDto) {
    const parsed = GravamenSinPlacaSchema.parse(dto);
    return this.accionesService.gravamenSinPlaca(parsed.codplaca);
  }

  @Post('generar-gravamen-sin-placa')
  async generarGravamenSinPlaca(@Body() body: { codplaca: string; numingr: string; operador: string }) {
    return this.accionesService.generarGravamenSinPlaca(body);
  }

  @Post('imprimir-record-pendiente')
  async imprimirRecordPendiente(@Body() dto: ImprimirRecordPendienteDto) {
    const parsed = ImprimirRecordPendienteSchema.parse(dto);
    return this.accionesService.imprimirRecordPendiente(parsed);
  }

  @Post('verificar-condicion-fraccionamiento')
  async verificarCondicionFraccionamiento(
    @Body() body: { codigo: string; param: string },
  ) {
    return this.accionesService.verificarCondicionFraccionamiento(body.codigo, body.param);
  }

  @Post('calcular-cuotas')
  async calcularCuotas(
    @Body() body: { cuotas: number; totalDeuda: number; totalInicial: number; fecGen: string; fecCuo: string },
  ) {
    return this.accionesService.calcularCuotas(body.cuotas, body.totalDeuda, body.totalInicial, body.fecGen, body.fecCuo);
  }

  @Post('fraccionar-papeleta')
  async fraccionarPapeleta(@Body() dto: FraccionarPapeletaDto) {
    const parsed = FraccionarPapeletaSchema.parse(dto);
    return this.accionesService.fraccionarPapeleta(parsed);
  }

  @Post('ver-fraccionamiento')
  async verFraccionamiento(@Body() dto: VerFraccionamientoDto) {
    const parsed = VerFraccionamientoSchema.parse(dto);
    return this.accionesService.verFraccionamiento(parsed);
  }

  @Post('resolucion-fraccionamiento')
  async resolucionFraccionamiento(@Body() body: { codigo: string; convenio: string }) {
    return this.accionesService.resolucionFraccionamiento(body.codigo, body.convenio);
  }

  @Get('grid-importar-excel')
  async gridImportarExcel() {
    return this.accionesService.gridImportarExcel();
  }

  @Post('importar-excel')
  async importarExcel(@Body() dto: ImportarExcelDto) {
    const parsed = ImportarExcelSchema.parse(dto);
    return this.accionesService.importarExcel(parsed);
  }

  // ── Row action buttons ────────────────────────────────────

  @Post('cargar-detalle-infraccion')
  async cargarDetalleInfraccion(@Body() dto: CargarDetalleInfraccionDto) {
    const parsed = CargarDetalleInfraccionSchema.parse(dto);
    return this.accionesService.cargarDetalleInfraccion(parsed);
  }

  @Post('buscar-resolucion-sancion')
  async buscarResolucionSancion(@Body() dto: BuscarResolucionSancionDto) {
    const parsed = BuscarResolucionSancionSchema.parse(dto);
    return this.accionesService.buscarResolucionSancion(parsed);
  }

  @Post('grabar-resolucion-sancion')
  async grabarResolucionSancion(@Body() dto: GrabarResolucionSancionDto) {
    const parsed = GrabarResolucionSancionSchema.parse(dto);
    return this.accionesService.grabarResolucionSancion(parsed);
  }

  @Get('listar-estados')
  async listarEstados() {
    return this.accionesService.listarEstados();
  }

  @Post('buscar-cambio-estado')
  async buscarCambioEstado(@Body() dto: BuscarCambioEstadoDto) {
    const parsed = BuscarCambioEstadoSchema.parse(dto);
    return this.accionesService.buscarCambioEstado(parsed);
  }

  @Post('grabar-cambio-estado')
  async grabarCambioEstado(@Request() req: any, @Body() dto: GrabarCambioEstadoDto) {
    const parsed = GrabarCambioEstadoSchema.parse(dto);
    const usuarioLogueado = req.user?.username || req.user?.sub;
    return this.accionesService.grabarCambioEstado(parsed, usuarioLogueado);
  }

  @Post('generar-liquidacion')
  async generarLiquidacion(@Body() dto: GenerarLiquidacionDto) {
    const parsed = GenerarLiquidacionSchema.parse(dto);
    return this.accionesService.generarLiquidacion(parsed);
  }

  // ── Búsquedas (lookup panels) ─────────────────────────────

  @Post('consulta-propietario')
  async consultaPropietario(@Body() body: unknown) {
    const parsed = ConsultaPropietarioSchema.parse(body);
    return this.accionesService.consultaPropietario(parsed);
  }

  @Post('consulta-conductor')
  async consultaConductor(@Body() body: unknown) {
    const parsed = ConsultaConductorSchema.parse(body);
    return this.accionesService.consultaConductor(parsed);
  }

  @Post('consulta-placa')
  async consultaPlaca(@Body() body: unknown) {
    const parsed = ConsultaPlacaSchema.parse(body);
    return this.accionesService.consultaPlaca(parsed);
  }

  @Post('consulta-policia')
  async consultaPolicia(@Body() body: unknown) {
    const parsed = ConsultaPoliciaSchema.parse(body);
    return this.accionesService.consultaPolicia(parsed);
  }

  @Post('consulta-lugar')
  async consultaLugar(@Body() body: unknown) {
    const parsed = ConsultaLugarSchema.parse(body);
    return this.accionesService.consultaLugar(parsed);
  }

  @Get('combos-lugar')
  async obtenerCombosLugar() {
    return this.accionesService.obtenerCombosLugar();
  }

  @Post('buscar-envio-coactivo')
  async buscarEnvioCoactivo(@Body() dto: BuscarEnvioCoactivoDto) {
    const parsed = BuscarEnvioCoactivoSchema.parse(dto);
    return this.accionesService.buscarEnvioCoactivo(parsed);
  }

  @Post('grabar-envio-coactivo')
  async grabarEnvioCoactivo(@Body() dto: GrabarEnvioCoactivoDto) {
    const parsed = GrabarEnvioCoactivoSchema.parse(dto);
    return this.accionesService.grabarEnvioCoactivo(parsed, 'USUARIO', 'SIGMUN-API');
  }

  @Post('consulta-infracciones')
  async consultaInfracciones(@Body() body: unknown) {
    const parsed = ConsultaInfraccionesSchema.parse(body);
    return this.accionesService.consultaInfracciones(parsed);
  }

  @Post('grabar-juca')
  async grabarJuca(@Body() body: { cmbtipocallen: string; txtncallen: string; cmbtipolugarn: string; txtnlugarn: string }) {
    return this.accionesService.grabarJuca(body);
  }

  @Post('grabar-conpro')
  async grabarConPro(@Body() body: any) {
    return this.accionesService.grabarConPro(body);
  }

  @Get('combos-placa')
  async obtenerCombosPlaca() {
    return this.accionesService.obtenerCombosPlaca();
  }

  @Post('grabar-placa')
  async grabarPlaca(@Body() body: {
    mquery?: number;
    idtramplac?: number;
    codplac: string;
    codplac1?: string;
    tipvehi?: string;
    codmarc?: string;
    codcolo?: string;
    aniofab?: string;
    formalidad?: string;
    codigo?: string;
    estado?: string;
    usuario?: string;
    estacion?: string;
    fechIngreso?: string;
  }) {
    return this.accionesService.grabarPlaca(body);
  }

  // ── Endpoints de datos para reportes HTML ──────────────────────────────────

  @Post('reporte-estado-cuenta')
  async reporteEstadoCuenta(@Body() dto: ReporteEstadoCuentaDto) {
    const parsed = ReporteEstadoCuentaSchema.parse(dto);
    return this.accionesService.obtenerDatosReporteEstadoCuenta(parsed);
  }

  @Post('reporte-certificado-no-adeudo')
  async reporteCertificadoNoAdeudo(@Body() dto: ReporteCertificadoNoAdeudoDto) {
    const parsed = ReporteCertificadoNoAdeudoSchema.parse(dto);
    return this.accionesService.obtenerDatosReporteCertificado(parsed);
  }

  @Post('reporte-gravamen')
  async reporteGravamen(@Body() dto: ReporteGravamenDto) {
    const parsed = ReporteGravamenSchema.parse(dto);
    return this.accionesService.obtenerDatosReporteGravamen(parsed);
  }

  @Post('reporte-resolucion-sancion')
  async reporteResolucionSancion(@Body() dto: ReporteResolucionSancionDto) {
    const parsed = ReporteResolucionSancionSchema.parse(dto);
    return this.accionesService.obtenerDatosReporteResolucionSancion(parsed);
  }
}
