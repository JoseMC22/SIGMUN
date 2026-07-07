import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchRegistroSolicitudDto } from './dto/search-registro-solicitud.dto';
import { SaveRegistroSolicitudDto } from './dto/save-registro-solicitud.dto';
import { SaveRepresentanteDto } from './dto/save-representante.dto';
import {
  SpContribuyenteSearchRow,
  SpContribuyenteTotal,
  SpContribuyenteDetail,
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

export function calculateContribuyentePaginationParams(page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  return { inicio, final };
}

@Injectable()
export class RegistroSolicitudService {
  private readonly logger = new Logger(RegistroSolicitudService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchRegistroSolicitudDto): Promise<PaginatedResponse<ContribuyenteRow>> {
    const {
      tipo_busqueda,
      codigo,
      nombres,
      paterno,
      materno,
      razon,
      num_doc,
      cod_pred,
      checkfrac,
      placa,
      anno,
      cod_via,
      urbbus,
      nro,
      dpto,
      mza,
      lte,
      sublote,
      page,
      pageSize,
    } = dto;

    const { inicio, final } = calculateContribuyentePaginationParams(page, pageSize);

    let total = 0;
    let data: ContribuyenteRow[] = [];

    if (tipo_busqueda === 'P') {
      // Predio search (busc 15 for count, busc 14 for rows)
      const SP_PARAMS = {
        anno: anno || '',
        id_via: cod_via || '',
        nro: nro || '',
        dpto: dpto || '',
        Mza: mza || '',
        Lte: lte || '',
        SubLte: sublote || '',
        cod_pred: cod_pred || '',
        cod_urb: urbbus || '',
        checkfrac: checkfrac || '0',
      };

      const totalResult = await this.db.executeProcedure<any>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 15, ...SP_PARAMS },
      );
      const totalRow = totalResult.recordset[0];
      total = totalRow ? (Object.values(totalRow)[0] as number) : 0;

      const rowsResult = await this.db.executeProcedure<any>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 14, inicio, final, ...SP_PARAMS },
      );

      data = rowsResult.recordset.map((row) => ({
        codigo: row.codigo ?? '',
        numDoc: row.num_doc ?? row.documento ?? '',
        nombres: row.nombre ?? row.nombres ?? '',
        paterno: row.paterno ?? '',
        materno: row.materno ?? '',
        tipoDocumento: row.documento ?? '',
        distrito: row.codpos ?? '',
        direccionFiscal: row.direccion ?? row.DireFis ?? '',
        tipoDetalle: row.tipo_detalle ?? '',
        gestion: row.Gestion ?? '',
        estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
        codPred: row.cod_pred ?? '',
        anexo: row.anexo ?? '',
        subAnexo: row.sub_anexo ?? '',
      }));
    } else if (tipo_busqueda === 'V') {
      // Placa/Vehículo search (busc 17 for count, busc 18 for rows)
      const totalResult = await this.db.executeProcedure<any>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 17, placa: placa || '' },
      );
      const totalRow = totalResult.recordset[0];
      total = totalRow ? (Object.values(totalRow)[0] as number) : 0;

      const rowsResult = await this.db.executeProcedure<any>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 18, placa: placa || '', inicio, final },
      );

      data = rowsResult.recordset.map((row) => ({
        codigo: row.codigo ?? '',
        numDoc: row.documento ?? row.num_doc ?? '',
        nombres: row.nombres ?? row.nombre ?? '',
        paterno: row.paterno ?? '',
        materno: row.materno ?? '',
        tipoDocumento: row.documento ?? '',
        distrito: row.codpos ?? '',
        direccionFiscal: row.direccion ?? row.DireFis ?? '',
        tipoDetalle: row.tipo_detalle ?? '',
        gestion: row.Gestion ?? '',
        estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
        placa: row.placa ?? '',
      }));
    } else {
      // Standard search (busc 6 for count, busc 5 for rows)
      const SP_PARAMS = {
        tipo_busqueda: tipo_busqueda || '',
        codigo: codigo || '',
        nombres: nombres || '',
        paterno: paterno || '',
        materno: materno || '',
        razon: razon || '',
        num_doc: num_doc || '',
        cod_pred: cod_pred || '',
        checkfrac: checkfrac || '0',
      };

      const totalResult = await this.db.executeProcedure<SpContribuyenteTotal>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 6, ...SP_PARAMS },
      );
      const totalRow = totalResult.recordset[0];
      total = totalRow ? Object.values(totalRow)[0] as number : 0;

      const rowsResult = await this.db.executeProcedure<SpContribuyenteSearchRow>(
        '[Rentas].[sp_Mcontribuyente]',
        { busc: 5, inicio, final, ...SP_PARAMS },
      );

      data = rowsResult.recordset.map((row) => ({
        codigo: row.codigo ?? '',
        numDoc: row.num_doc ?? '',
        nombres: row.nombres ?? '',
        paterno: row.paterno ?? '',
        materno: row.materno ?? '',
        tipoDocumento: row.documento ?? '',
        distrito: row.codpos ?? '',
        direccionFiscal: row.DireFis ?? '',
        tipoDetalle: row.tipo_detalle ?? '',
        gestion: row.Gestion ?? '',
        estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
      }));
    }

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getById(codigo: string): Promise<SpContribuyenteDetail> {
    const result = await this.db.executeProcedure<SpContribuyenteDetail>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 4, codigo },
    );
    const row = result.recordset[0];
    if (!row) {
      throw new NotFoundException('Contribuyente no encontrado');
    }
    return row;
  }

  async save(dto: SaveRegistroSolicitudDto, operador: string, estacion: string): Promise<{ success: boolean; codigo?: string }> {
    const isUpdate = !!dto.codigo;

    if (!isUpdate) {
      const { exists } = await this.validateDni(dto.num_doc);
      if (exists) {
        throw new ConflictException('El número de documento ya existe');
      }
    }

    const busc = isUpdate ? 2 : 1;

    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      {
        busc,
        codigo: dto.codigo || null,
        id_pers: dto.id_pers || null,
        id_docu: dto.id_docu,
        num_doc: dto.num_doc,
        nombres: dto.nombres || null,
        paterno: dto.paterno || null,
        materno: dto.materno || null,
        id_dist: dto.id_dist || null,
        tipourb: dto.tipourb || null,
        des_urb: dto.des_urb || null,
        tipovia: dto.tipovia || null,
        des_via: dto.des_via || null,
        id_zona: dto.id_zona || null,
        id_urba: dto.id_urba || null,
        id_via: dto.id_via || null,
        referencia: dto.referencia || null,
        manzana: dto.manzana || null,
        lote: dto.lote || null,
        sub_lote: dto.sub_lote || null,
        numero: dto.numero || null,
        departam: dto.departam || null,
        id_tipocontri: dto.id_tipocontri || null,
        id_subtipocontri: dto.id_subtipocontri || null,
        id_motivo_actualizacion: dto.id_motivo_actualizacion || null,
        telefono1: dto.telefono1 || null,
        anexo1: dto.anexo1 || null,
        telefono2: dto.telefono2 || null,
        anexo2: dto.anexo2 || null,
        letra1: dto.letra1 || null,
        numero2: dto.numero2 || null,
        letra2: dto.letra2 || null,
        tipo_interior_id: dto.tipo_interior_id || null,
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id || null,
        tipo_ingreso_id: dto.tipo_ingreso_id || null,
        tipo_edificio_id: dto.tipo_edificacion_id || null,
        nombre_edificio: dto.nombre_edificio || null,
        nombre_ingreso: dto.nombre_ingreso || null,
        nombre_agrupamiento: dto.nombre_agrupamiento || null,
        piso: dto.piso || null,
        letra_interno: dto.letra_interno || null,
        numero_interno: dto.numero_interno || null,
        correo_e: dto.correo_e || null,
        partida_defuncion: dto.partida_defuncion || null,
        fecha_defuncion: dto.fecha_defuncion || null,
        flag_notificar: dto.flag_notificar || null,
        operador,
        estacion,
      },
    );

    const codigoGenerado = result.recordset[0]?.codigo_generado || dto.codigo;
    return { success: true, codigo: codigoGenerado };
  }

  async eliminar(codigo: string, motivo: string, operador: string): Promise<{ success: boolean }> {
    await this.db.executeProcedure(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 3, codigo, motivo: motivo || '', operador },
    );
    return { success: true };
  }

  async validateDni(numDoc: string): Promise<{ exists: boolean; data?: { nombres: string; paterno: string; materno: string } }> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 26, num_doc: numDoc },
    );
    const row = result.recordset[0];
    const exists = row ? Object.values(row).some(v => String(v) === '1' || String(v).toUpperCase() === 'TRUE') : false;

    let externalData: { nombres: string; paterno: string; materno: string } | undefined = undefined;
    try {
      const token = 'apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N';
      const response = await fetch(`http://api.apis.net.pe/v1/dni?numero=${numDoc}`, {
        headers: {
          'Referer': 'https://apis.net.pe/consulta-dni-api',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const body = await response.json();
        externalData = {
          nombres: body.nombres ?? '',
          paterno: body.apellidoPaterno ?? '',
          materno: body.apellidoMaterno ?? '',
        };
      }
    } catch (e) {
      console.error('Error fetching external DNI api:', e);
    }

    return { exists, data: externalData };
  }

  async getTiposContribuyente(): Promise<TipoContribuyente[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 7 },
    );
    return result.recordset.map((row) => ({
      id_tipocontri: row.id_tipocontri ? String(row.id_tipocontri).trim() : '',
      tipo_detalle: row.tipo_detalle ?? '',
    }));
  }

  async getSubtiposContribuyente(idTipo: string): Promise<SubtipoContribuyente[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 8, id_tipocontri: idTipo },
    );
    return result.recordset.map((row) => ({
      id_subtipocontri: row.id_subtipocontri ? String(row.id_subtipocontri).trim() : '',
      subtipo_detalle: row.subtipo_detalle ?? '',
    }));
  }

  async getMotivosActualizacion(): Promise<MotivoActualizacion[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 9 },
    );
    return result.recordset.map((row) => ({
      motivo_actualizacion_id: row.motivo_actualizacion_id ?? '',
      descripcion: row.descripcion ?? '',
    }));
  }

  async getTiposInterior(): Promise<TipoInterior[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 10 },
    );
    return result.recordset.map((row) => ({
      tipo_interior_id: row.tipo_interior_id ?? '',
      descripcion: row.descripcion ?? '',
    }));
  }

  async getTiposEdificacion(): Promise<TipoEdificacion[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 11 },
    );
    return result.recordset.map((row) => ({
      tipo_edificacion_id: row.tipo_edificacion_id ?? '',
      descripcion: row.descripcion ?? '',
    }));
  }

  async getTiposIngreso(): Promise<TipoIngreso[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 12 },
    );
    return result.recordset.map((row) => ({
      tipo_ingreso_id: row.tipo_ingreso_id ?? '',
      descripcion: row.descripcion ?? '',
    }));
  }

  async getTiposAgrupamiento(): Promise<TipoAgrupamiento[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 13 },
    );
    return result.recordset.map((row) => ({
      tipo_agrupamiento_id: row.tipo_agrupamiento_id ?? '',
      descripcion: row.descripcion ?? '',
    }));
  }

  async getDocumentos(): Promise<DocumentoOption[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 24 },
    );
    return result.recordset.map((row) => ({
      id: (row.id_doc ?? '').split('/')[0],
      nombre: row.documento ?? '',
    }));
  }

  async getDistritos(): Promise<DistritoOption[]> {
    const result = await this.db.executeProcedure<any>(
      '[Contenedor].[SP_TblDistrito]',
      { msquery: 1 },
    );
    return result.recordset.map((row) => ({
      id_post: row.id_post ?? '',
      codpos: row.codpos ?? '',
    }));
  }

  async getVias(): Promise<TipoViaOption[]> {
    const result = await this.db.executeProcedure<any>(
      '[sp_MVias]',
      { busc: 7 },
    );
    return result.recordset.map((row) => ({
      id_tipo: row.id_tipo ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async getUrbanizaciones(idUrba: string): Promise<any[]> {
    const result = await this.db.executeProcedure<any>(
      '[sp_MVias]',
      { busc: 6, id_urba: idUrba },
    );
    return result.recordset;
  }

  async searchVias(query: string): Promise<any[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[SP_vw_Mvias]',
      {
        msquery: 1,
        nombre_via: query || '',
      },
    );
    const mappedResults = result.recordset.map((row) => ({
      codigo: row.cod_via ? String(row.cod_via).trim() : '',
      codzona: row.id_zona ? String(row.id_zona).trim() : '',
      nomzona: row.nom_zona ? String(row.nom_zona).trim() : '',
      codurba: row.id_urba ? String(row.id_urba).trim() : '',
      nomurba: `${row.nombabr ?? ''} ${row.nombres ?? ''}`.trim(),
      nomvia: `${row.tipoabr ?? ''} ${row.nombre_via ?? ''}`.trim(),
    }));

    // Filter unique vias by codigo
    const uniqueMap = new Map();
    for (const item of mappedResults) {
      if (!uniqueMap.has(item.codigo)) {
        uniqueMap.set(item.codigo, item);
      }
    }

    return Array.from(uniqueMap.values());
  }

  async getSolicitudesByContribuyente(codigo: string, idSolicitud: string, page: number, pageSize: number): Promise<{ data: SolicitudRow[]; total: number }> {
    const inicio = (page - 1) * pageSize;
    const fin = page * pageSize;

    const totalResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculosolicitud_buscant]',
      { codigo, id_solicitud: idSolicitud || '' },
    );
    const total = totalResult.recordset[0] ? (Object.values(totalResult.recordset[0])[0] as number) : 0;

    const rowsResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculosolicitud_busqueda]',
      { codigo, id_solicitud: idSolicitud || '', inicio, fin },
    );

    const data = rowsResult.recordset.map((row) => ({
      id_solicitud: String(row.id_solicitud ?? ''),
      anio: String(row.anio ?? ''),
      fecha: row.fecha_ingreso ? new Date(row.fecha_ingreso).toLocaleDateString('es-PE') : '',
      placa: row.placa ? String(row.placa) : '',
    }));

    return { data, total };
  }

  async getSolicitudDetail(codigo: string, idSolicitud?: string): Promise<SolicitudDetail> {
    const spName = idSolicitud
      ? '[vehicular].[sp_vehiculosolicitud_inf]'
      : '[vehicular].[sp_vehiculosolicitud_infcontri]';

    const params: Record<string, any> = { codigo };
    if (idSolicitud) params['idsolicitud'] = idSolicitud;

    const result = await this.db.executeProcedure<any>(spName, params);
    const row = result.recordset[0];
    if (!row) throw new NotFoundException('Solicitud no encontrada');

    const trim = (v: any) => (v ? String(v).trim() : '');

    if (!idSolicitud) {
      // sp_vehiculosolicitud_infcontri — columns confirmed from DB
      const nombre = [trim(row.apellpat), trim(row.apellmat), trim(row.nomcontrib)]
        .filter(Boolean).join(' ');
      return {
        id_solicitud: '',
        anio: String(new Date().getFullYear()),
        codigo: trim(row.codigo),
        nombre,
        tipo_doc: trim(row.documento),
        num_doc: trim(row.num_doc),
        tipo_persona: trim(row.tipo_detalle),
        tipo_contri: trim(row.nomtcontrib),
        direccion: trim(row.dircompleta) || trim(row.des_via),
        distrito: trim(row.distrito),
        provincia: '',       // SP infcontri does not return provincia
        departamento: '',    // SP infcontri does not return departamento
        telefono1: trim(row.telefono1),
        telefono2: trim(row.telefono2),
        celular: trim(row.celular),
        correo: trim(row.correo_e),
        petitorio: '',
        hecho: '',
        derecho: '',
        num_recibo: '',
        fecha_recibo: '',
      };
    }

    // sp_vehiculosolicitud_inf — confirmed columns from DB
    const nombre = [trim(row.apellpat), trim(row.apellmat), trim(row.nomcontrib)]
      .filter(Boolean).join(' ');

    return {
      id_solicitud: idSolicitud,
      anio: trim(row.anio) || String(new Date().getFullYear()),
      codigo: trim(row.codigo),
      nombre,
      tipo_doc: trim(row.documento),
      num_doc: trim(row.num_doc),
      tipo_persona: trim(row.tipo_detalle),
      tipo_contri: trim(row.nomtcontrib),
      direccion: trim(row.dircompleta) || trim(row.des_via),
      distrito: trim(row.distrito),
      provincia: '',          // SP does not return provincia
      departamento: '',       // SP does not return departamento
      telefono1: trim(row.telefono1),
      telefono2: trim(row.telefono2),
      celular: trim(row.celular),
      correo: trim(row.correo_e),
      petitorio: trim(row.petitorio),
      hecho: trim(row.funda_hecho),
      derecho: trim(row.funda_derecho),
      num_recibo: trim(row.num_recibo),
      fecha_recibo: row.fecha_pago && row.fecha_pago !== '1900-01-01'
        ? new Date(row.fecha_pago).toLocaleDateString('es-PE')
        : '',
    };
  }

  async saveSolicitud(
    codigo: string,
    idSolicitud: string | null,
    dto: {
      petitorio: string;
      hecho: string;
      derecho: string;
      num_recibo: string;
      fecha_recibo: string;
      anio: string;
    },
    operador: string,
    estacion: string,
  ): Promise<{ success: boolean; idSolicitud?: string }> {
    const mquery = idSolicitud ? '2' : '1';
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro_sol]',
      {
        mquery,
        xid_solicitud: idSolicitud ?? '0',
        xidtingreso: 1,
        xid_area: 3,
        xidcontrib: codigo,
        xnum_recibo: dto.num_recibo || '',
        xfecha_pago: dto.fecha_recibo || '',
        xpetitorio: dto.petitorio || '',
        xfunda_hecho: dto.hecho || '',
        xfunda_derecho: dto.derecho || '',
        xoperador: operador,
        xestacion: estacion,
        xfecha_ingreso: new Date().toLocaleDateString('es-PE', { hour12: false }),
        xestado: 1,
        xanio: dto.anio || String(new Date().getFullYear()),
      },
    );
    const out = result.recordset[0];
    return { success: true, idSolicitud: out ? String(Object.values(out)[1] ?? '') : undefined };
  }

  async getDJListado(codigo: string, idSolicitud: string, criteriodj: string, page: number, pageSize: number): Promise<{ data: DjRow[]; total: number }> {
    const inicio = (page - 1) * pageSize;
    const fin = pageSize;

    const totalResult = await this.db.executeProcedure<any>(
      '[dbo].[sp_vehiculo_djlistado_cant]',
      { codigo, idsolic: idSolicitud, Criteriodj: criteriodj || '' },
    );
    const totalRow = totalResult.recordset[0];
    const total = totalRow ? (Object.values(totalRow)[0] as number) ?? 0 : 0;

    const rowsResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_djlistado]',
      { codigo, idsolic: idSolicitud, Criteriodj: criteriodj || '', inicio, fin },
    );

    const data = rowsResult.recordset.map((row) => {
      const r = Object.values(row) as any[];
      return {
        id_dj: String(row.id_dj ?? r[0] ?? ''),
        num_decla: String(row.num_decla ?? r[1] ?? ''),
        anio_dj: String(row.anio_dj ?? r[2] ?? ''),
        fecha_decla: (row.fecha_decla ?? r[5])
          ? new Date(row.fecha_decla ?? r[5]).toLocaleDateString('es-PE')
          : '',
        imp_anual: String(row.imp_anual ?? r[4] ?? ''),
        id_solicitud: String(row.id_solicitud ?? r[3] ?? idSolicitud),
      };
    });

    return { data, total };
  }

  async deleteSolicitud(idSolicitud: string, operador: string, estacion: string): Promise<{ success: boolean; message: string }> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro_sol]',
      {
        mquery: '3',
        xid_solicitud: idSolicitud,
        xoperador: operador,
        xestacion: estacion,
      },
    );
    const row = result.recordset[0];
    const message = row ? String(Object.values(row)[1] ?? 'OK') : 'OK';
    return { success: true, message };
  }

  async getDJCombos(): Promise<{
    propiedades: { id: string; nombre: string }[];
    idAnio: string;
    tasa: string;
    idTasa: string;
    numDecla: string;
  }> {
    const anio = String(new Date().getFullYear());

    const propRes = await this.db.executeProcedure<any>('[vehicular].[sp_vehiculo_tablas]', { tipo: 'propiedad' });
    const propiedades = propRes.recordset.map((r: any) => ({
      id: String(r.id_propiedad ?? ''),
      nombre: String(r.nombre ?? ''),
    }));

    const anioRes = await this.db.executeProcedure<any>('[vehicular].[sp_vehiculo_tablas]', { tipo: 'anio', anio });
    const idAnio = String(anioRes.recordset[0]?.id_anio ?? '');

    const tasaRes = await this.db.executeProcedure<any>('[vehicular].[sp_vehiculo_tablas]', { tipo: 'tasaanio', anio: idAnio });
    const idTasa = String(tasaRes.recordset[0]?.id_tasa ?? '');
    const tasa = String(tasaRes.recordset[0]?.tasa ?? '0');

    const numRes = await this.db.executeProcedure<any>('[vehicular].[sp_vehiculo_tablas]', { tipo: 'anio_dj', anio });
    const numDecla = String(numRes.recordset[0]?.num_decla ?? 'Proceso');

    return { propiedades, idAnio, tasa, idTasa, numDecla };
  }

  // ──────────────────────────────────────────────
  // Representante methods
  // ──────────────────────────────────────────────

  async getRepresentantesByContribuyente(codigo: string): Promise<RepresentanteRow[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      { busc: 4, codigo },
    );
    return result.recordset.map((row) => ({
      id_representante: String(row.id_representante ?? row[0] ?? '').trim(),
      codigo_contribuyente: String(row.codigo_contribuyente ?? row[1] ?? '').trim(),
      nombres: String(row.nombres ?? row[2] ?? '').trim(),
      paterno: String(row.paterno ?? row[3] ?? '').trim(),
      materno: String(row.materno ?? row[4] ?? '').trim(),
      id_documento: String(row.id_documento ?? row[5] ?? '').trim(),
      num_documento: String(row.num_documento ?? row[6] ?? '').trim(),
      tipo_relacion_id: String(row.tipo_relacion_id ?? row[7] ?? '').trim(),
      tipo_relacion_nombre: String(row.tipo_relacion_nombre ?? row[8] ?? '').trim(),
      id_dist: String(row.id_dist ?? row[9] ?? '').trim(),
      id_via: String(row.id_via ?? row[10] ?? '').trim(),
      id_zona: String(row.id_zona ?? row[11] ?? '').trim(),
      id_urba: String(row.id_urba ?? row[12] ?? '').trim(),
      manzana: String(row.manzana ?? row[13] ?? '').trim(),
      lote: String(row.lote ?? row[14] ?? '').trim(),
      sub_lote: String(row.sub_lote ?? row[15] ?? '').trim(),
      numero: String(row.numero ?? row[16] ?? '').trim(),
      departam: String(row.departam ?? row[17] ?? '').trim(),
      referencia: String(row.referencia ?? row[18] ?? '').trim(),
      piso: String(row.piso ?? row[19] ?? '').trim(),
      letra1: String(row.letra1 ?? row[20] ?? '').trim(),
      numero2: String(row.numero2 ?? row[21] ?? '').trim(),
      letra2: String(row.letra2 ?? row[22] ?? '').trim(),
      tipo_interior_id: String(row.tipo_interior_id ?? row[23] ?? '').trim(),
      numero_interno: String(row.numero_interno ?? row[24] ?? '').trim(),
      letra_interno: String(row.letra_interno ?? row[25] ?? '').trim(),
      tipo_edificacion_id: String(row.tipo_edificacion_id ?? row[26] ?? '').trim(),
      nombre_edificio: String(row.nombre_edificio ?? row[27] ?? '').trim(),
      tipo_ingreso_id: String(row.tipo_ingreso_id ?? row[28] ?? '').trim(),
      nombre_ingreso: String(row.nombre_ingreso ?? row[29] ?? '').trim(),
      tipo_agrupamiento_id: String(row.tipo_agrupamiento_id ?? row[30] ?? '').trim(),
      nombre_agrupamiento: String(row.nombre_agrupamiento ?? row[31] ?? '').trim(),
      nestado: String(row.nestado ?? row[32] ?? '').trim(),
    }));
  }

  async getRepresentanteById(id: string): Promise<RepresentanteRow> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      { busc: 6, id: Number(id) },
    );
    const row = result.recordset[0];
    if (!row) {
      throw new NotFoundException('Representante no encontrado');
    }
    return {
      id_representante: String(row.id_representante ?? row[0] ?? '').trim(),
      codigo_contribuyente: String(row.codigo_contribuyente ?? row[1] ?? '').trim(),
      nombres: String(row.nombres ?? row[2] ?? '').trim(),
      paterno: String(row.paterno ?? row[3] ?? '').trim(),
      materno: String(row.materno ?? row[4] ?? '').trim(),
      id_documento: String(row.id_documento ?? row[5] ?? '').trim(),
      num_documento: String(row.num_documento ?? row[6] ?? '').trim(),
      tipo_relacion_id: String(row.tipo_relacion_id ?? row[7] ?? '').trim(),
      tipo_relacion_nombre: String(row.tipo_relacion_nombre ?? row[8] ?? '').trim(),
      id_dist: String(row.id_dist ?? row[9] ?? '').trim(),
      id_via: String(row.id_via ?? row[10] ?? '').trim(),
      id_zona: String(row.id_zona ?? row[11] ?? '').trim(),
      id_urba: String(row.id_urba ?? row[12] ?? '').trim(),
      manzana: String(row.manzana ?? row[13] ?? '').trim(),
      lote: String(row.lote ?? row[14] ?? '').trim(),
      sub_lote: String(row.sub_lote ?? row[15] ?? '').trim(),
      numero: String(row.numero ?? row[16] ?? '').trim(),
      departam: String(row.departam ?? row[17] ?? '').trim(),
      referencia: String(row.referencia ?? row[18] ?? '').trim(),
      piso: String(row.piso ?? row[19] ?? '').trim(),
      letra1: String(row.letra1 ?? row[20] ?? '').trim(),
      numero2: String(row.numero2 ?? row[21] ?? '').trim(),
      letra2: String(row.letra2 ?? row[22] ?? '').trim(),
      tipo_interior_id: String(row.tipo_interior_id ?? row[23] ?? '').trim(),
      numero_interno: String(row.numero_interno ?? row[24] ?? '').trim(),
      letra_interno: String(row.letra_interno ?? row[25] ?? '').trim(),
      tipo_edificacion_id: String(row.tipo_edificacion_id ?? row[26] ?? '').trim(),
      nombre_edificio: String(row.nombre_edificio ?? row[27] ?? '').trim(),
      tipo_ingreso_id: String(row.tipo_ingreso_id ?? row[28] ?? '').trim(),
      nombre_ingreso: String(row.nombre_ingreso ?? row[29] ?? '').trim(),
      tipo_agrupamiento_id: String(row.tipo_agrupamiento_id ?? row[30] ?? '').trim(),
      nombre_agrupamiento: String(row.nombre_agrupamiento ?? row[31] ?? '').trim(),
      nestado: String(row.nestado ?? row[32] ?? '').trim(),
    };
  }

  async createRepresentante(dto: SaveRepresentanteDto, operador: string, estacion: string): Promise<{ id: string }> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      {
        busc: 1,
        codigo: dto.codigo_contribuyente,
        nombres: dto.nombres || null,
        paterno: dto.paterno || null,
        materno: dto.materno || null,
        id_docu: dto.id_documento,
        num_doc: dto.num_documento,
        id_tipo_relacion: dto.tipo_relacion_id,
        id_dist: dto.id_dist || null,
        id_via: dto.id_via || null,
        id_zona: dto.id_zona || null,
        id_urba: dto.id_urba || null,
        manzana: dto.manzana || null,
        lote: dto.lote || null,
        sub_lote: dto.sub_lote || null,
        numero: dto.numero || null,
        departam: dto.departam || null,
        referencia: dto.referencia || null,
        piso: dto.piso || null,
        letra1: dto.letra1 || null,
        numero2: dto.numero2 || null,
        letra2: dto.letra2 || null,
        tipo_interior_id: dto.tipo_interior_id || null,
        numero_interno: dto.numero_interno || null,
        letra_interno: dto.letra_interno || null,
        tipo_edificacion_id: dto.tipo_edificacion_id || null,
        nombre_edificio: dto.nombre_edificio || null,
        tipo_ingreso_id: dto.tipo_ingreso_id || null,
        nombre_ingreso: dto.nombre_ingreso || null,
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id || null,
        nombre_agrupamiento: dto.nombre_agrupamiento || null,
        operador,
        estacion,
      },
    );
    return { id: result.recordset[0]?.id_representante ?? '' };
  }

  async updateRepresentante(id: string, dto: SaveRepresentanteDto, operador: string, estacion: string): Promise<{ success: boolean }> {
    await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      {
        busc: 2,
        id: Number(id),
        codigo: dto.codigo_contribuyente,
        nombres: dto.nombres || null,
        paterno: dto.paterno || null,
        materno: dto.materno || null,
        id_docu: dto.id_documento,
        num_doc: dto.num_documento,
        id_tipo_relacion: dto.tipo_relacion_id,
        id_dist: dto.id_dist || null,
        id_via: dto.id_via || null,
        id_zona: dto.id_zona || null,
        id_urba: dto.id_urba || null,
        manzana: dto.manzana || null,
        lote: dto.lote || null,
        sub_lote: dto.sub_lote || null,
        numero: dto.numero || null,
        departam: dto.departam || null,
        referencia: dto.referencia || null,
        piso: dto.piso || null,
        letra1: dto.letra1 || null,
        numero2: dto.numero2 || null,
        letra2: dto.letra2 || null,
        tipo_interior_id: dto.tipo_interior_id || null,
        numero_interno: dto.numero_interno || null,
        letra_interno: dto.letra_interno || null,
        tipo_edificacion_id: dto.tipo_edificacion_id || null,
        nombre_edificio: dto.nombre_edificio || null,
        tipo_ingreso_id: dto.tipo_ingreso_id || null,
        nombre_ingreso: dto.nombre_ingreso || null,
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id || null,
        nombre_agrupamiento: dto.nombre_agrupamiento || null,
        operador,
        estacion,
      },
    );
    return { success: true };
  }

  async deleteRepresentante(id: string, codigo: string, operador: string): Promise<{ success: boolean }> {
    await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      { busc: 7, id: Number(id), codigo, operador },
    );
    return { success: true };
  }

  async getTiposRelacion(): Promise<TipoRelacion[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      { busc: 5 },
    );
    return result.recordset.map((row) => ({
      tipo_relacion_id: String(row.col0 ?? row.tipo_relacion_id ?? '').trim(),
      descripcion: row.col1 ?? row.descripcion ?? '',
    }));
  }

  async verificarRepresentante(codigo: string): Promise<{ exists: boolean }> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      { busc: 25, codigo },
    );
    const row = result.recordset[0];
    const exists = row ? String(Object.values(row)[0]).toLowerCase() === 'true' : false;
    return { exists };
  }

  async saveDJ(dto: {
    id_dj?: string;
    num_decla: string;
    anio_dj: string;
    id_solicitud: string;
    idcontrib: string;
    id_propiedad: string;
    id_vehiculo: string;
    base_imponible1: number;
    imp_anual1: number;
    anio1: string;
    base_imponible2: number;
    imp_anual2: number;
    anio2: string;
    base_imponible3: number;
    imp_anual3: number;
    anio3: string;
    id_tasa: string;
    fecha_decla: string;
    imprimir: string;
    operador: string;
    estacion: string;
  }): Promise<{ success: boolean; result?: string }> {
    const baseTotal = dto.base_imponible1 + dto.base_imponible2 + dto.base_imponible3;
    const trim1 = dto.imp_anual1 / 4;
    const trim2 = dto.imp_anual2 / 4;
    const trim3 = dto.imp_anual3 / 4;
    const fechaIngreso = new Date().toLocaleDateString('es-PE', { hour12: false });

    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro_dj_insertar]',
      {
        mquery: 1,
        num_decla: dto.num_decla,
        anio_dj: dto.anio_dj,
        id_solicitud: dto.id_solicitud,
        idcontrib: dto.idcontrib,
        id_propiedad: dto.id_propiedad,
        id_vehiculo: dto.id_vehiculo || '0',
        valor_tabla: baseTotal || 0,
        valor_incremen: 0,
        valor_refer: baseTotal || 0,
        base_imponible1: dto.base_imponible1 || 0,
        imp_anual1: dto.imp_anual1 || 0,
        imp_trim1: trim1 || 0,
        anio1: dto.anio1 || dto.anio_dj,
        base_imponible2: dto.base_imponible2 || 0,
        imp_anual2: dto.imp_anual2 || 0,
        imp_trim2: trim2 || 0,
        anio2: dto.anio2 || '',
        base_imponible3: dto.base_imponible3 || 0,
        imp_anual3: dto.imp_anual3 || 0,
        imp_trim3: trim3 || 0,
        anio3: dto.anio3 || '',
        id_tasa: dto.id_tasa,
        porcen_condom: 0,
        fecha_decla: dto.fecha_decla,
        operador: dto.operador,
        estacion: dto.estacion,
        fecha_ingreso: fechaIngreso,
        estado: 1,
        aniofabrica: '',
        idcate: '',
        idmarca: '',
        idmodelo: '',
        imprimir: dto.imprimir || '0',
      },
    );
    const out = result.recordset[0];
    return { success: true, result: out ? String(Object.values(out)[0] ?? 'OK') : 'OK' };
  }
}
