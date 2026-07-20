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
import { SaveVehiculoDto } from './dto/save-vehiculo.dto';

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
        numDoc: '',
        nombres: row.nombre ?? row.nombres ?? '',
        paterno: '',
        materno: '',
        tipoDocumento: '',
        distrito: '',
        direccionFiscal: row.direcion ?? row.direccion ?? row.DireFis ?? '',
        tipoDetalle: '',
        gestion: '',
        estado: 'ACTIVADO',
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
        numDoc: row.nro_documento ?? row.documento ?? row.num_doc ?? '',
        nombres: row.nomcontrib ?? row.nombres ?? row.nombre ?? '',
        paterno: '',
        materno: '',
        tipoDocumento: '',
        distrito: '',
        direccionFiscal: row.DireFis ?? row.direccion ?? '',
        tipoDetalle: '',
        gestion: '',
        estado: 'ACTIVADO',
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
    // Se usa SQL directo en vez del SP porque el SP tiene columnas sin alias
    // (isnull(a.id_motivo_actualizacion, '') y CONVERT(fecha_defuncion))
    // que el driver mssql devuelve sin nombre, perdiendo el valor.
    const query = `
      SELECT a.codigo, a.id_pers, a.id_docu, a.num_doc, a.nombres,
        CONCAT(CASE WHEN a.id_tipocontri='04' THEN 'SUC. ' ELSE '' END, dbo.trim(RTRIM(LTRIM(a.paterno)))) as paterno,
        a.materno, a.id_dist, a.tipourb, a.des_urb, a.tipovia, a.des_via,
        a.id_zona, a.id_urba, a.id_via, a.referencia, a.manzana, a.lote,
        a.sub_lote, a.numero, a.departam, a.nestado, a.operador, a.estacion,
        a.fech_ing, b.documento, d.codpos as distrito, z.nombres as zona, t.nombabr, m.nombres as nombre_urba,
        v.nombre_via, a.id_tipocontri, a.id_subtipocontri,
        ISNULL(a.id_motivo_actualizacion, '') as id_motivo_actualizacion,
        a.telefono1, a.anexo1, a.telefono2, a.anexo2, a.fax, a.letra1, a.numero2, a.letra2,
        a.tipo_interior_id, g.tipo_agrupamiento_id, i.tipo_ingreso_id, e.tipo_edificacion_id,
        a.nombre_edificio, a.nombre_ingreso, a.nombre_agrupamiento, a.piso, a.letra_interno, a.numero_interno,
        a.correo_e, a.partida_defuncion, CONVERT(VARCHAR(10), a.fecha_defuncion, 103) as fecha_defuncion,
        ISNULL(a.flag_notificar, '') as flag_notificar
      FROM Rentas.Mcontribuyente a
      LEFT JOIN Contenedor.TblDocumen b ON a.id_docu = b.id_doc
      LEFT JOIN Contenedor.TblDistrito d ON a.id_dist = d.id_post
      LEFT JOIN Rentas.MZonas z ON a.id_zona = z.id_zona
      LEFT JOIN Rentas.MCurba m ON a.id_urba = m.id_urba
      LEFT JOIN Rentas.TblTipo_CP t ON m.tipourb = t.tipourb
      LEFT JOIN Rentas.MVias v ON a.id_via = v.cod_via
      LEFT JOIN Contenedor.TblTipoAgrupamiento g ON a.tipo_agrupamiento_id = g.tipo_agrupamiento_id
      LEFT JOIN Contenedor.TblTipoIngreso i ON a.tipo_ingreso_id = i.tipo_ingreso_id
      LEFT JOIN Contenedor.TblTipoEdificacion e ON a.tipo_edificio_id = e.tipo_edificacion_id
      WHERE a.codigo = @codigo
    `;

    const result = await this.db.queryWithParams<any>(query, { codigo });
    let row = result.recordset[0];
    if (!row) {
      throw new NotFoundException('Contribuyente no encontrado');
    }
    // Solucionar campos que vienen como arrays del procedimiento almacenado
    const fixField = (value: any) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : "";
      }
      return value;
    };
    row = {
      ...row,
      telefono1: fixField(row.telefono1),
      anexo1: fixField(row.anexo1),
      telefono2: fixField(row.telefono2),
      anexo2: fixField(row.anexo2),
    };

    if (row.id_dist === '012' && (row.id_urba || row.id_via)) {
      try {
        const viasResult = await this.db.executeProcedure<any>(
          '[Rentas].[SP_vw_Mvias]',
          {
            msquery: 4,
            cod_via: row.id_via || '',
            id_urba: row.id_urba || ''
          }
        );
        if (viasResult.recordset && viasResult.recordset.length > 0) {
          const vRow = viasResult.recordset[0];
          row.zona = String(vRow.nom_zona || '').trim() || row.zona;
          row.nombabr = String(vRow.nombabr || '').trim() || row.nombabr;
          row.nombre_urba = String(vRow.nombres || '').trim() || row.nombre_urba;
          row.nombre_via = `${vRow.tipoabr ?? ''} ${vRow.nombre_via ?? ''}`.trim() || row.nombre_via;
        }
      } catch (e) {
      }
    }

    return row;
  }

  async save(dto: SaveRegistroSolicitudDto, operador: string, estacion: string, idperfil: string): Promise<{ success: boolean; codigo?: string }> {
    const isUpdate = !!dto.codigo;

    // En actualización, si id_pers está vacío, obtenerlo del registro existente
    if (isUpdate && !dto.id_pers) {
      try {
        const existing = await this.getById(dto.codigo!);
        dto.id_pers = existing.id_pers;
      } catch {
      }
    }

    if (!isUpdate) {
      const { exists } = await this.validateDni(dto.num_doc);
      if (exists) {
        throw new ConflictException('El número de documento ya existe');
      }
    }

    let finalTipovia = dto.tipovia || '';
    let finalTipourb = dto.tipourb || '';
    let finalDesVia = dto.des_via || '';
    let finalDesUrb = dto.des_urb || '';
    let finalIdVia = dto.id_via || '';
    let finalIdUrba = dto.id_urba || '';


    // Obtener tipovia y tipourb desde SP_vw_Mvias si id_dist es 012 (como el PHP original)
    if (dto.id_dist === '012') {
      const viasResult = await this.db.executeProcedure<any>(
        '[Rentas].[SP_vw_Mvias]',
        {
          msquery: 4,
          cod_via: dto.id_via || '',
          id_urba: dto.id_urba || ''
        }
      );
      if (viasResult.recordset && viasResult.recordset.length > 0) {
        const row = viasResult.recordset[0];
        // Try both index access and property access in case the SP returns named columns
        finalTipovia = row[1] || row.tipovia || row.TIPOVIA || ''; 
        finalTipourb = row[3] || row.tipourb || row.TIPOURB || '';
      }
      // Para id_dist 012, usar id_via/id_urba y los nombres de via/urbano
      finalIdVia = dto.id_via || '';
      finalIdUrba = dto.id_urba || '';
      finalDesVia = dto.des_via || ''; // El PHP usa txtViacontri que es el nombre
      finalDesUrb = dto.des_urb || '';
    } else {
      // Para otros distritos, cvia y curba están vacíos, usar tipovia/tipourb y des_via/des_urb
      finalIdVia = '';
      finalIdUrba = '';
    }

    const busc = isUpdate ? 2 : 1;
    const motivo = isUpdate 
      ? 'Acción - Actualización - Operador ' + operador + ' - Estación : ' + estacion 
      : 'Acción - Ingreso - Operador ' + operador + '- Estación : ' + estacion;


    const spParams = {
      busc,
      codigo: dto.codigo || null,
      id_pers: dto.id_pers || '',
      id_docu: dto.id_docu,
      num_doc: dto.num_doc,
      nombres: dto.nombres || '',
      paterno: dto.paterno || '',
      materno: dto.materno || '',
      id_dist: dto.id_dist || '',
      tipourb: finalTipourb,
      des_urb: finalDesUrb,
      tipovia: finalTipovia,
      des_via: finalDesVia,
      id_zona: dto.id_zona || '',
      id_urba: finalIdUrba,
      id_via: finalIdVia,
      referencia: dto.referencia || '',
      manzana: dto.manzana || '',
      lote: dto.lote || '',
      sub_lote: dto.sub_lote || '',
      numero: dto.numero || '',
      departam: dto.departam || '',
      nestado: parseInt(dto.nestado || '1', 10),
      motivo,
      id_tipocontri: dto.id_tipocontri || '',
      id_subtipocontri: dto.id_subtipocontri || '',
      id_motivo_actualizacion: dto.id_motivo_actualizacion || '',
      telefono1: dto.telefono1 || '',
      anexo1: dto.anexo1 || '',
      telefono2: dto.telefono2 || '',
      anexo2: dto.anexo2 || '',
      letra1: dto.letra1 || '',
      numero2: dto.numero2 || '',
      letra2: dto.letra2 || '',
      tipo_interior_id: dto.tipo_interior_id || '',
      tipo_agrupamiento_id: dto.tipo_agrupamiento_id || '',
      tipo_ingreso_id: dto.tipo_ingreso_id || '',
      tipo_edificio_id: dto.tipo_edificio_id || '',
      nombre_edificio: dto.nombre_edificio || '',
      nombre_ingreso: dto.nombre_ingreso || '',
      nombre_agrupamiento: dto.nombre_agrupamiento || '',
      piso: dto.piso || '',
      letra_interno: dto.letra_interno || '',
      numero_interno: dto.numero_interno || '',
      correo_e: dto.correo_e || '',
      partida_defuncion: dto.partida_defuncion || '',
      fecha_defuncion: dto.fecha_defuncion || '',
      flag_notificar: dto.flag_notificar || '',
      operador,
      estacion,
      idperfil,
    };

    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mcontribuyente]',
      spParams,
    );


    // Verificar si el SP devolvió un mensaje de error o ROLLBACK
    const firstResult = result.recordset[0];
    let spResultValue = '';
    if (firstResult) {
      const keys = Object.keys(firstResult);
      spResultValue = firstResult[keys[0]];

      // Check for errors
      if (typeof spResultValue === 'string') {
        if (spResultValue.toLowerCase().includes('rollback') || spResultValue.toLowerCase().includes('error')) {
          throw new Error(spResultValue);
        }
        if (spResultValue.toLowerCase().includes('no tiene permiso')) {
          throw new Error(spResultValue);
        }
      }
    }

    const codigoGenerado = spResultValue || dto.codigo;
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
      '[Rentas].[sp_MVias]',
      { busc: 7 },
    );
    return result.recordset.map((row) => ({
      id_tipo: row.tipovia ?? '',
      nombre: row.tipovia ?? '',
    }));
  }

  async getUrbanizaciones(idUrba: string): Promise<any[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_MVias]',
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
      fecha: row.fecha_ingreso ? (() => {
        const d = new Date(row.fecha_ingreso);
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })() : '',
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
      fecha_recibo: (function() {
        const rawDate = row.fecha_pago || row.fecha_recibo || Object.values(row)[37];
        if (!rawDate || String(rawDate).includes('1900-01-01')) return '';
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })(),
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

    // Avoid Date object conversion — new Date('YYYY-MM-DD') can shift by ±1 day
    // depending on the Node.js process timezone. The date picker already produces
    // 'YYYY-MM-DD' which SQL Server accepts directly via implicit cast.
    const toDateStr = (raw: string | null | undefined): string => {
      if (!raw || !raw.trim()) {
        // Current date in UTC, no local timezone ambiguity
        const n = new Date();
        return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`;
      }
      const t = raw.trim();
      // Already YYYY-MM-DD → return as-is, no Date conversion
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      // Fallback for other formats
      const d = new Date(t);
      if (isNaN(d.getTime())) {
        const n = new Date();
        return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`;
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };

    const fechaPagoStr = toDateStr(dto.fecha_recibo);
    const n = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const fechaIngresoStr = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;


    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro_sol]',
      {
        mquery,
        xid_solicitud: idSolicitud ?? '0',
        xidtingreso: 1,
        xid_area: 3,
        xidcontrib: codigo,
        xnum_recibo: dto.num_recibo || '',
        xfecha_pago: fechaPagoStr,
        xpetitorio: dto.petitorio || '',
        xfunda_hecho: dto.hecho || '',
        xfunda_derecho: dto.derecho || '',
        xoperador: operador,
        xestacion: estacion,
        xfecha_ingreso: fechaIngresoStr,
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
    
    let rows: any[] = [];
    if (result.recordset && result.recordset.length > 0) {
      rows = result.recordset;
    } else if (result.recordsets && (result.recordsets as any[]).length > 0 && (result.recordsets as any[])[0].length > 0) {
      rows = (result.recordsets as any[])[0];
    }
    
    return rows.map((row) => {
      return {
        id_representante: String(row.id ?? row[0] ?? '').trim(),
        codigo_contribuyente: String(row.codigo ?? row[1] ?? '').trim(),
        id_documento: String(row.id_docu ?? row[2] ?? '').trim(), // MSSELECT column 3 (0-based index 2)
        num_documento: String(row.num_doc ?? row[3] ?? '').trim(), // MSSELECT column4 (index 3)
        nombres: String(row.nombres ?? row[4] ?? '').trim(),
        paterno: String(row.paterno ?? row[5] ?? '').trim(),
        materno: String(row.materno ?? row[6] ?? '').trim(),
        id_dist: String(row.id_dist ?? row[7] ?? '').trim(),
        id_zona: String(row.id_zona ?? row[12] ?? '').trim(), // id_zona is MSSELECT column 13 (index 12)
        id_urba: String(row.id_urba ?? row[13] ?? '').trim(), // id_urba is MSSELECT column14 (index13)
        id_via: String(row.id_via ?? row[14] ?? '').trim(), // id_via is MSSELECT column15 (index14)
        manzana: String(row.manzana ?? row[16] ?? '').trim(), // manzana MSSELECT column17 (index16)
        lote: String(row.lote ?? row[17] ?? '').trim(), // lote column18 (index17)
        sub_lote: String(row.sub_lote ?? row[18] ?? '').trim(), // sub_lote column19 (index18)
        numero: String(row.numero ?? row[19] ?? '').trim(), // numero column20 (index19)
        departam: String(row.departam ?? row[20] ?? '').trim(), // departam column21 (index20)
        referencia: String(row.referencia ?? row[15] ?? '').trim(), // referencia column16 (index15)
        piso: String(row.piso ?? row[33] ?? '').trim(), // piso isn't in msselect, set to empty for now
        letra1: String(row.letra1 ?? row[34] ?? '').trim(),
        numero2: String(row.numero2 ?? row[35] ?? '').trim(),
        letra2: String(row.letra2 ?? row[36] ?? '').trim(),
        tipo_interior_id: String(row.tipo_interior_id ?? row[37] ?? '').trim(),
        numero_interno: String(row.numero_interno ?? row[38] ?? '').trim(),
        letra_interno: String(row.letra_interno ?? row[39] ?? '').trim(),
        tipo_edificacion_id: String(row.tipo_edificacion_id ?? row[40] ?? '').trim(),
        nombre_edificio: String(row.nombre_edificio ?? row[41] ?? '').trim(),
        tipo_ingreso_id: String(row.tipo_ingreso_id ?? row[42] ?? '').trim(),
        nombre_ingreso: String(row.nombre_ingreso ?? row[43] ?? '').trim(),
        tipo_agrupamiento_id: String(row.tipo_agrupamiento_id ?? row[44] ?? '').trim(),
        nombre_agrupamiento: String(row.nombre_agrupamiento ?? row[45] ?? '').trim(),
        tipo_relacion_id: String(row.tipo_relacion_id ?? row[''] ?? '').trim(), // msselect returns r.descripcion not id, so we'll leave empty for msselect
        tipo_relacion_nombre: String(row.descripcion ?? row[31] ?? '').trim(),
        nestado: String(row.nestado ?? row[21] ?? '').trim(),
      };
    });
  }

  async getRepresentanteById(id: string): Promise<RepresentanteRow> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      { busc: 6, id: Number(id) },
    );
    
    let row: any = null;
    if (result.recordset && result.recordset.length > 0) {
      row = result.recordset[0];
    } else if (result.recordsets && (result.recordsets as any[]).length > 0 && (result.recordsets as any[])[0].length > 0) {
      row = (result.recordsets as any[])[0][0];
    }
    
    if (!row) {
      throw new NotFoundException('Representante no encontrado');
    }
    
    return {
      id_representante: String(row.id ?? row[0] ?? '').trim(),
      codigo_contribuyente: String(row.codigo ?? row[1] ?? '').trim(),
      id_documento: String(row.id_docu ?? row[2] ?? '').trim(),
      num_documento: String(row.num_doc ?? row[3] ?? '').trim(),
      nombres: String(row.nombres ?? row[4] ?? '').trim(),
      paterno: String(row.paterno ?? row[5] ?? '').trim(),
      materno: String(row.materno ?? row[6] ?? '').trim(),
      id_dist: String(row.id_dist ?? row[7] ?? '').trim(),
      id_zona: String(row.id_zona ?? row[12] ?? '').trim(),
      id_urba: String(row.id_urba ?? row[13] ?? '').trim(),
      id_via: String(row.id_via ?? row[14] ?? '').trim(),
      referencia: String(row.referencia ?? row[15] ?? '').trim(),
      manzana: String(row.manzana ?? row[16] ?? '').trim(),
      lote: String(row.lote ?? row[17] ?? '').trim(),
      sub_lote: String(row.sub_lote ?? row[18] ?? '').trim(),
      numero: String(row.numero ?? row[19] ?? '').trim(),
      departam: String(row.departam ?? row[20] ?? '').trim(),
      nestado: String(row.nestado ?? row[21] ?? '').trim(),
      letra1: String(row.letra1 ?? row[33] ?? '').trim(),
      numero2: String(row.numero2 ?? row[34] ?? '').trim(),
      letra2: String(row.letra2 ?? row[35] ?? '').trim(),
      piso: String(row.piso ?? row[36] ?? '').trim(),
      numero_interno: String(row.numero_interno ?? row[37] ?? '').trim(),
      letra_interno: String(row.letra_interno ?? row[38] ?? '').trim(),
      tipo_interior_id: String(row.tipo_interior_id ?? row[39] ?? '').trim(),
      tipo_edificacion_id: String(row.tipo_edificio_id ?? row[40] ?? '').trim(),
      nombre_edificio: String(row.nombre_edificio ?? row[41] ?? '').trim(),
      tipo_ingreso_id: String(row.tipo_ingreso_id ?? row[42] ?? '').trim(),
      nombre_ingreso: String(row.nombre_ingreso ?? row[43] ?? '').trim(),
      tipo_agrupamiento_id: String(row.tipo_agrupamiento_id ?? row[44] ?? '').trim(),
      nombre_agrupamiento: String(row.nombre_agrupamiento ?? row[45] ?? '').trim(),
      tipo_relacion_id: String(row.tipo_relacion_id ?? row[31] ?? '').trim(),
      tipo_relacion_nombre: String(row.descripcion ?? row[''] ?? '').trim(),
    };
  }

  async createRepresentante(dto: SaveRepresentanteDto, operador: string, estacion: string): Promise<{ id: string }> {
    
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      {
        busc: 1,
        codigo: dto.codigo_contribuyente,
        nombres: dto.nombres || '',
        paterno: dto.paterno || '',
        materno: dto.materno || '',
        id_docu: dto.id_documento,
        num_doc: dto.num_documento,
        id_tipo_relacion: dto.tipo_relacion_id,
        id_dist: dto.id_dist || '',
        id_via: dto.id_via || '',
        id_zona: dto.id_zona || '',
        id_urba: dto.id_urba || '',
        manzana: dto.manzana || '',
        lote: dto.lote || '',
        sub_lote: dto.sub_lote || '',
        numero: dto.numero || '',
        departam: dto.departam || '',
        referencia: dto.referencia || '',
        piso: dto.piso || '',
        letra1: dto.letra1 || '',
        numero2: dto.numero2 || '',
        letra2: dto.letra2 || '',
        tipo_interior_id: dto.tipo_interior_id || '',
        numero_interno: dto.numero_interno || '',
        letra_interno: dto.letra_interno || '',
        tipo_edificio_id: dto.tipo_edificacion_id || '',
        nombre_edificio: dto.nombre_edificio || '',
        tipo_ingreso_id: dto.tipo_ingreso_id || '',
        nombre_ingreso: dto.nombre_ingreso || '',
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id || '',
        nombre_agrupamiento: dto.nombre_agrupamiento || '',
        operador,
        estacion,
      },
    );

    
    // Obtener id_representante de forma segura: puede estar en la primera posición del array o en una propiedad
    let idRepresentante = '';
    // Intentar con recordset primero
    if (result.recordset && result.recordset.length > 0) {
      const firstRow = result.recordset[0];
      if (firstRow) {
        idRepresentante = firstRow.id_representante ?? firstRow[0] ?? '';
        if (idRepresentante) {
          idRepresentante = String(idRepresentante).trim();
        }
      }
    } 
    // Si no, intentar con recordsets (plural)
    else if (result.recordsets && (result.recordsets as any[]).length > 0 && (result.recordsets as any[])[0].length > 0) {
      const firstRow = (result.recordsets as any[])[0][0];
      if (firstRow) {
        idRepresentante = firstRow.id_representante ?? firstRow[0] ?? '';
        if (idRepresentante) {
          idRepresentante = String(idRepresentante).trim();
        }
      }
    }
    return { id: idRepresentante };
  }

  async updateRepresentante(id: string, dto: SaveRepresentanteDto, operador: string, estacion: string): Promise<{ success: boolean }> {
    await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mrepresentante]',
      {
        busc: 2,
        id: Number(id),
        codigo: dto.codigo_contribuyente,
        nombres: dto.nombres || '',
        paterno: dto.paterno || '',
        materno: dto.materno || '',
        id_docu: dto.id_documento,
        num_doc: dto.num_documento,
        id_tipo_relacion: dto.tipo_relacion_id,
        id_dist: dto.id_dist || '',
        id_via: dto.id_via || '',
        id_zona: dto.id_zona || '',
        id_urba: dto.id_urba || '',
        manzana: dto.manzana || '',
        lote: dto.lote || '',
        sub_lote: dto.sub_lote || '',
        numero: dto.numero || '',
        departam: dto.departam || '',
        referencia: dto.referencia || '',
        piso: dto.piso || '',
        letra1: dto.letra1 || '',
        numero2: dto.numero2 || '',
        letra2: dto.letra2 || '',
        tipo_interior_id: dto.tipo_interior_id || '',
        numero_interno: dto.numero_interno || '',
        letra_interno: dto.letra_interno || '',
        tipo_edificio_id: dto.tipo_edificacion_id || '',
        nombre_edificio: dto.nombre_edificio || '',
        tipo_ingreso_id: dto.tipo_ingreso_id || '',
        nombre_ingreso: dto.nombre_ingreso || '',
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id || '',
        nombre_agrupamiento: dto.nombre_agrupamiento || '',
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

  async getDJDetalle(idDj: string): Promise<any> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_djdetalle]',
      { id_dj: idDj }
    );
    if (result.recordset.length > 0) {
      const r = result.recordset[0];
      const vals = Object.values(r);

      // Helper: prefer named column, fallback to positional index
      const col = (name: string, idx: number): string => {
        if (r[name] !== undefined && r[name] !== null) return String(r[name]);
        return String(vals[idx] ?? '');
      };

      const colDate = (name: string, idx: number): string => {
        const raw = r[name] !== undefined ? r[name] : vals[idx];
        if (!raw) return '';
        if (raw instanceof Date) {
          const dd = String(raw.getUTCDate()).padStart(2, '0');
          const mm = String(raw.getUTCMonth() + 1).padStart(2, '0');
          const yyyy = raw.getUTCFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        // String like '2026-05-28T00:00:00.000Z' or '28/05/2026 00:00:00'
        const s = String(raw);
        // ISO format
        if (s.includes('T') || (s.includes('-') && s.indexOf('-') === 4)) {
          const d = new Date(s);
          if (!isNaN(d.getTime())) {
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getUTCFullYear()}`;
          }
        }
        // Already dd/mm/yyyy or dd/mm/yyyy hh:mm:ss
        return s.split(' ')[0];
      };

      return {
        id_dj:           col('id_dj',           0),
        num_decla:       col('num_decla',        1),
        anio_dj:         col('anio_dj',          2),
        id_solicitud:    col('id_solicitud',     3),
        idcontrib:       col('idcontrib',        4),
        id_propiedad:    col('id_propiedad',     5),
        base_imponible1: col('base_imponible1',  7),
        id_tasa:         col('id_tasa',          8),
        tasa:            col('tasa',             9),
        imp_anual1:      col('imp_anual1',       10),
        fecha_decla:     colDate('fecha_decla',  11),
        id_vehiculo:     col('id_vehiculo',      15),
        base_imponible2: col('base_imponible2',  20),
        imp_anual2:      col('imp_anual2',       21),
        base_imponible3: col('base_imponible3',  22),
        imp_anual3:      col('imp_anual3',       23),
        anio1:           col('anio1',            24),
        anio2:           col('anio2',            25),
        anio3:           col('anio3',            26),
        imprimir:        col('imprimir',         27),
        num_placa:       col('num_placa',        28),
      };
    }
    return null;
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
    const now = new Date();

    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro_dj_insertar]',
      {
        mquery: 1,
        num_decla: dto.num_decla,
        anio_dj: dto.anio_dj,
        id_solicitud: dto.id_solicitud,
        idcontrib: dto.idcontrib,
        id_propiedad: dto.id_propiedad,
        id_vehiculo: dto.id_vehiculo || '',
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
        fecha_decla: dto.fecha_decla ? (() => {
          const [d, m, y] = dto.fecha_decla.split('/');
          return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
        })() : now,
        operador: dto.operador,
        estacion: dto.estacion,
        fecha_ingreso: now,                                               // datetime ← Date object
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

  // ──────────────────────────────────────────────
  // Registro Vehicular & Descargo methods
  // ──────────────────────────────────────────────

  async getVehiculosByContrib(codigo: string): Promise<{ id_vehiculo: string; num_placa: string; modelo: string }[]> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_formcombosdatos]',
      { codigo },
    );
    return result.recordset.map((r: any) => ({
      id_vehiculo: String(r.id_vehiculo ?? '').trim(),
      num_placa: String(r.num_placa ?? '').trim(),
      modelo: String(r.nombre_modelo ?? r.nombre_marca ?? '').trim(),
    }));
  }

  async getVehiculoCombos(): Promise<any> {
    const tipos = ['motor', 'adquisicion', 'combustible', 'carroceria', 'color', 'traccion', 'origen', 'categoria'];
    const combos: Record<string, any[]> = {};
    
    for (const tipo of tipos) {
      const res = await this.db.executeProcedure<any>('[vehicular].[sp_vehiculo_formcombos]', { tipo });
      combos[tipo] = res.recordset.map((r: any) => {
        const vals = Object.values(r);
        return {
          id: String(vals[0] ?? '').trim(),
          nombre: String(vals[1] ?? '').trim(),
        };
      });
    }
    return combos;
  }

  async getVehiculoDetail(idVehiculo: string): Promise<any> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_formregistrado]',
      { codigo: idVehiculo }
    );
    const row = result.recordset[0] || null;
    if (!row) return null;

    // Look up categoria/marca/modelo descriptions using the vehicle's id_modelo
    try {
      const vals = Object.values(row);
      // id_modelo is at column index 12
      const idModelo = String(row['id_modelo'] ?? vals[12] ?? '').trim();
      if (idModelo) {
        const rModelo = await this.db.executeProcedure<any>(
          '[vehicular].[sp_vehiculo_form_modeloycategoria]',
          { opcion: 'id', criterio: idModelo, categoria: '', inicio: 0, fin: 1 }
        );
        if (rModelo.recordset.length > 0) {
          const mRow = rModelo.recordset[0];
          const mVals = Object.values(mRow);
          // columns: id, id_categoria, categoria, id_marca, marca, nombre(modelo)
          row._categoria_desc = String(mRow['categoria'] ?? mVals[2] ?? '').trim();
          row._marca_desc     = String(mRow['marca']     ?? mVals[4] ?? '').trim();
          row._modelo_desc    = String(mRow['nombre']    ?? mVals[5] ?? '').trim();
        } else {
          row._categoria_desc = ''; row._marca_desc = ''; row._modelo_desc = '';
        }
      } else {
        row._categoria_desc = ''; row._marca_desc = ''; row._modelo_desc = '';
      }
    } catch {
      row._categoria_desc = ''; row._marca_desc = ''; row._modelo_desc = '';
    }

    return row;
  }

  async searchModelos(opcion: string, criterio: string, categoria: string, page: number, pageSize: number): Promise<{ data: any[]; total: number }> {
    const inicio = page > 1 ? ((page - 1) * pageSize) + 1 : 0;
    const fin = page * pageSize;

    const totalRes = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_form_modeloycategoria_cant]',
      { opcion: opcion || '', criterio: criterio || '', categoria: categoria || '' }
    );
    const totalRow = totalRes.recordset[0];
    const total = totalRow ? (Object.values(totalRow)[0] as number) ?? 0 : 0;

    const dataRes = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_form_modeloycategoria]',
      { opcion: opcion || '', criterio: criterio || '', categoria: categoria || '', inicio, fin }
    );
    const data = dataRes.recordset.map((r: any) => {
      const vals = Object.values(r);
      return {
        id: vals[0],
        id_categoria: vals[1],
        categoria: vals[2],
        id_marca: vals[3],
        marca: vals[4],
        nombre: vals[5],
        estado: String(vals[6]) === '0' ? 'INACTIVO' : 'ACTIVO'
      };
    });

    return { data, total };
  }

  async saveVehiculo(dto: SaveVehiculoDto, operador: string, estacion: string): Promise<any> {
    const mquery = dto.id_vehiculo ? '2' : '1';
    const now = new Date();
    // Parse an ISO date string (YYYY-MM-DD) into a Date object.
    // Passing Date objects to tedious avoids all SET DATEFORMAT issues.
    const toDate = (s?: string, fallback = '2000-01-01'): Date => new Date(s || fallback);

    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_registro]',
      {
        mquery,
        xid_vehiculo: dto.id_vehiculo || '0',
        xidcontrib: dto.idcontrib,
        xnum_placa: dto.placa?.toUpperCase() || '',
        xnum_tarjeta_prop: dto.tarjeta_propiedad?.toUpperCase() || '',
        xnum_motor: dto.num_motor?.toUpperCase() || '',
        xid_adqui: dto.id_adquisicion || 0,
        xfecha_adqui: toDate(dto.fecha_adqui),          // datetime ← Date object
        xanio_fabrica: dto.anio_fabrica || '',
        xcilindro: dto.cilindros || '',
        xpeso_vehicular: dto.peso_vehicular || '0',
        xid_categoria: dto.id_categoria || '',
        xid_marca: dto.id_marca || '',
        xid_modelo: dto.id_modelo || '',
        xid_carroceria: dto.id_carroceria || 0,
        xid_motor: dto.id_motor || 0,
        xid_traccion: dto.id_traccion || 0,
        xid_origen: dto.id_origen || 0,
        xid_combustible: dto.id_combustible || 0,
        xid_color: dto.id_color || 0,
        xvalor_soles: dto.valor_vehiculo || '0',
        xvalor_ref: 0,
        desmodelalt: dto.desmodelalt?.toUpperCase() || '',
        xValordol: dto.valor_dol || '0',
        xtipoc: dto.tipoc || '0',
        xcilindrada: dto.cilindrada || '',
        xinscrip: toDate(dto.inscrip),                   // datetime ← Date object
        xclase: dto.clase || '',
        xnasientos: dto.nasientos || '',
        xnruedas: dto.nruedas || '',
        xneje: dto.neje || '',
        xTransmi: dto.transmi || '',
        xnserie: dto.nserie || '',
        xoperador: operador,
        xestacion: estacion,
        xfecha_ingreso: now,                             // datetime ← Date object (current timestamp)
        xestado: dto.nestado || 1,
        inafecto: dto.inafecto === '1' ? 1 : 0,
        xfecha_boleta: toDate(dto.fecha_boleta, '2016-01-01'), // datetime ← Date object
      }
    );
    
    const out = result.recordset[0];
    if (!out) {
       return { success: false, message: 'Error desconocido' };
    }

    const vals = Object.values(out);
    let idVehiculo: string | null = null;
    let savedOk = false;
    let savedMsg = '';

    // sp_vehiculo_registro returns: select @xid,'vvvvv','vRegistro ingresado'
    // Depending on how mssql/tedious serializes unnamed columns, vals may be:
    //   A) [single comma-separated string] — when all 3 unnamed columns collapse into one
    //   B) [3 values] — when columns are properly separated
    //   C) [1 value with 'ingresado'] — when only the message column survives

    // Helper: extract the 6-digit vehicle ID from any string
    const extractId = (raw: string): string => {
      // If it's the full "015859,vvvvv,vRegistro ingresado", take first part
      if (raw.includes(',')) return raw.split(',')[0].trim();
      // If it's just the message like "vRegistro ingresado", return null
      return '';
    };

    if (vals.length === 1 && typeof vals[0] === 'string' && vals[0].includes(',')) {
      // Path A: single comma-separated string
      const parts = vals[0].split(',');
      if (parts.length >= 3) {
        const msg = parts[2].trim();
        savedOk = msg.toLowerCase().includes('ingresado') || msg.toLowerCase().includes('actualizado');
        if (savedOk) { idVehiculo = parts[0].trim(); savedMsg = msg; }
      }
    } else if (vals.length >= 3) {
      // Path B: 3 separate columns
      savedMsg = String(vals[2] ?? '');
      savedOk = savedMsg.toLowerCase().includes('ingresado') || savedMsg.toLowerCase().includes('actualizado');
      if (savedOk) idVehiculo = String(vals[0]);
    } else if (vals.length === 2) {
      // Path C: 2 columns (id + message)
      savedMsg = String(vals[1] ?? '');
      savedOk = savedMsg.toLowerCase().includes('ingresado') || savedMsg.toLowerCase().includes('actualizado');
      if (savedOk) idVehiculo = String(vals[0]);
    } else {
      // Path D: single column — check if it contains the ID or just the message
      const raw = String(vals[0] ?? '');
      if (raw.includes(',')) {
        const parts = raw.split(',');
        const msg = parts[2]?.trim() ?? parts[parts.length - 1]?.trim() ?? '';
        savedOk = msg.toLowerCase().includes('ingresado') || msg.toLowerCase().includes('actualizado');
        if (savedOk) { idVehiculo = parts[0].trim(); savedMsg = msg; }
      } else if (raw.toLowerCase().includes('ingresado') || raw.toLowerCase().includes('actualizado')) {
        savedOk = true; savedMsg = raw;
        // Message only — we don't have the ID. Extract from the raw row.
        const allVals = Object.values(out);
        for (const v of allVals) {
          const s = String(v ?? '');
          if (/^\d{6}$/.test(s)) { idVehiculo = s; break; }
        }
      } else {
        return { success: false, message: raw || 'Error desconocido' };
      }
    }

    if (!savedOk || !idVehiculo) {
      return { success: false, message: savedMsg || 'Error desconocido' };
    }

    // Safety: ensure idVehiculo is exactly 6 digits (strip any extra data)
    if (!/^\d{6}$/.test(idVehiculo)) {
      const cleaned = idVehiculo.replace(/[^0-9]/g, '').padStart(6, '0');
      idVehiculo = cleaned.slice(-6);
    }

    // ── Post-save: calculate tax bases for 3 years (mirrors PHP VehiculoController lines 806-994) ──
    try {
      const spCombos = '[vehicular].[sp_vehiculo_combos]';
      const spCalculo = '[vehicular].[sp_vehiculo_calculo]';
      const spTasas = '[vehicular].[sp_vehiculo_anio_tasas]';

      // sp_vehiculo_combos expects @idvehiculo int
      const idVehiculoInt = parseInt(idVehiculo, 10);


      // 1. Fetch anio1, categoria, marca, modelo in parallel
      const [rAnio1, rCate, rMarca, rModelo] = await Promise.all([
        this.db.executeProcedure<any>(spCombos, { tipo: 'anio',      idvehiculo: idVehiculoInt }),
        this.db.executeProcedure<any>(spCombos, { tipo: 'categoria', idvehiculo: idVehiculoInt }),
        this.db.executeProcedure<any>(spCombos, { tipo: 'marca',     idvehiculo: idVehiculoInt }),
        this.db.executeProcedure<any>(spCombos, { tipo: 'modelo',    idvehiculo: idVehiculoInt }),
      ]);

      // The CASE WHEN returns 0 (int) when the year is out of range — treat '0' as invalid
      const rawAnio1 = String(Object.values(rAnio1.recordset[0] ?? {})[0] ?? '0');
      const anio1    = rawAnio1 === '0' ? '' : rawAnio1;
      const idcate   = String(Object.values(rCate.recordset[0]   ?? {})[0] ?? '').trim();
      const idmarca  = String(Object.values(rMarca.recordset[0]  ?? {})[0] ?? '').trim();
      const idmodelo = String(Object.values(rModelo.recordset[0] ?? {})[0] ?? '').trim();
      const anioFabrica = dto.anio_fabrica || '';


      // 2. Fetch anio2, anio3 — same 0-means-invalid logic
      const [rAnio2, rAnio3] = await Promise.all([
        this.db.executeProcedure<any>(spCombos, { tipo: 'anio2', idvehiculo: idVehiculoInt }),
        this.db.executeProcedure<any>(spCombos, { tipo: 'anio3', idvehiculo: idVehiculoInt }),
      ]);
      const rawAnio2 = String(Object.values(rAnio2.recordset[0] ?? {})[0] ?? '0');
      const rawAnio3 = String(Object.values(rAnio3.recordset[0] ?? {})[0] ?? '0');
      const anio2 = rawAnio2 === '0' ? '' : rawAnio2;
      const anio3 = rawAnio3 === '0' ? '' : rawAnio3;


      // 3. Calculate montos via sp_vehiculo_calculo (@anio int, @anioadqui int)
      const anioadquiInt = parseInt(anioFabrica, 10) || 0;

      // Only call sp_vehiculo_calculo when we have valid combo data
      const hasCombos = idcate !== '' && idmarca !== '' && idmodelo !== '';
      const calcParams = (anioStr: string) => ({
        idvehiculo: idVehiculo,       // varchar(6)
        categoria: idcate,             // varchar(2)
        marca: idmarca,                // varchar(3)
        modelo: idmodelo,              // varchar(4)
        anio: parseInt(anioStr, 10),   // int
        anioadqui: anioadquiInt,       // int
      });

      const [rCalc1, rCalc2, rCalc3] = await Promise.all([
        (anio1 && hasCombos) ? this.db.executeProcedure<any>(spCalculo, calcParams(anio1)) : Promise.resolve({ recordset: [] }),
        (anio2 && hasCombos) ? this.db.executeProcedure<any>(spCalculo, calcParams(anio2)) : Promise.resolve({ recordset: [] }),
        (anio3 && hasCombos) ? this.db.executeProcedure<any>(spCalculo, calcParams(anio3)) : Promise.resolve({ recordset: [] }),
      ]);


      const getMonto = (rCalc: any, valorVehiculo: string): number => {
        const row = rCalc.recordset[0];
        if (!row) return 0;
        const v = Object.values(row);
        // Column index 7 = ve.monto (id_valor,id_anio,va.anio,id_cat,id_marca,id_modelo,anio_conten,monto,...)
        let monto = parseFloat(String(v[7] ?? '0')) || 0;
        if (monto < 1) return 0;
        const valVeh = parseFloat(valorVehiculo) || 0;
        return monto < valVeh ? valVeh : monto;
      };

      let monto1 = getMonto(rCalc1, dto.valor_vehiculo || '0');
      let monto2 = getMonto(rCalc2, dto.valor_vehiculo || '0');
      let monto3 = getMonto(rCalc3, dto.valor_vehiculo || '0');


      // 4. Tax rate: sp_vehiculo_anio_tasas expects @anio varchar(4) — cast to string
      const anioDecla = String(new Date().getFullYear() - 1);
      const rIdAnio = await this.db.executeProcedure<any>(spTasas, { tipo: 'anio_decla', anio: anioDecla });
      // select * from tblvehiculoanios → first col is id_anio
      const idAnio = String(Object.values(rIdAnio.recordset[0] ?? {})[0] ?? '');
      const rTasa = idAnio
        ? await this.db.executeProcedure<any>(spTasas, { tipo: 'anio', anio: idAnio })
        : { recordset: [] };
      // select id_tasa, tasa → index 1 is tasa
      const tasa = parseFloat(String(Object.values(rTasa.recordset[0] ?? {})[1] ?? '0')) || 0;


      // 5. If inafecto → all zeros (PHP lines 967-974)
      let impuesto1 = 0, impuesto2 = 0, impuesto3 = 0;
      if (dto.inafecto === '1') {
        monto1 = 0; monto2 = 0; monto3 = 0;
      } else {
        impuesto1 = monto1 * tasa;
        impuesto2 = monto2 * tasa;
        impuesto3 = monto3 * tasa;
      }


      return {
        success: true,
        id: idVehiculo,
        message: savedMsg,
        monto1, monto2, monto3,
        impuesto1, impuesto2, impuesto3,
        anio1, anio2, anio3,
        idcate, idmarca, idmodelo,
        anioFabrica,
      };
    } catch (calcErr) {
      return {
        success: true,
        id: idVehiculo,
        message: savedMsg,
        monto1: 0, monto2: 0, monto3: 0,
        impuesto1: 0, impuesto2: 0, impuesto3: 0,
        anio1: '', anio2: '', anio3: '',
      };
    }
  }

  async validaValorVehiculo(anio: string, idcate: string, idmarca: string, idmodel: string): Promise<{ exists: boolean }> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_validavalor]',
      {
        anio,
        idcate,
        idmarca,
        idmodel
      }
    );
    return { exists: result.recordset.length > 0 };
  }

  async getFormDescargo(codigoContrib: string, idVehiculo: string): Promise<any> {
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_descargo]',
      { tipo: '1', id_vehiculo: idVehiculo, codigo: codigoContrib }
    );
    
    if (result.recordset.length > 0) {
       const row = result.recordset[0];
       
       let nombredes = '';
       let fechadescargo = '';
       
       // Las columnas sin nombre (getNombres y fechadescargo) se agrupan en row[''] o vals[1]
       const rawUnnamed = row[''] !== undefined ? String(row['']) : String(Object.values(row)[1] ?? '');
       
       // Si fechadescargo existe, el string termina en ",DD/MM/YYYY"
       const dateMatch = rawUnnamed.match(/,(\d{2}\/\d{2}\/\d{4})$/);
       if (dateMatch) {
         fechadescargo = dateMatch[1];
         nombredes = rawUnnamed.substring(0, rawUnnamed.length - 11);
       } else {
         nombredes = rawUnnamed.endsWith(',') ? rawUnnamed.slice(0, -1) : rawUnnamed;
       }

       return {
         id_vehiculo: idVehiculo,
         codigo: codigoContrib,
         nombredes: nombredes,
         fechadescargo: fechadescargo,
         operador: String(row.operador ?? ''),
         estacion: String(row.estacion ?? ''),
         fech_ing: String(row.fech_ing ?? ''),
         observacion: String(row.observacion ?? ''),
       };
    }
    return null;
  }

  async descargarVehiculo(codigoContrib: string, idVehiculo: string, numPlaca: string, fechaDescargo: string, observacion: string, operador: string, estacion: string): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    // fechaDescargo comes as YYYY-MM-DD from the frontend date input
    const fechaDescargoDate = fechaDescargo ? new Date(fechaDescargo) : now;
    
    const result = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_descargo]',
      {
        tipo: '3',
        id_vehiculo: idVehiculo,
        codigo: codigoContrib,
        num_placa: numPlaca,
        fechadescargo: fechaDescargoDate,  // datetime ← Date object
        observacion,
        operador,
        estacion,
        fech_ing: now,                     // datetime ← Date object
      }
    );
    
    const out = result.recordset[0];
    return { success: true, message: out ? String(Object.values(out)[0]) : 'OK' };
  }

  async getTipoCambio(fecha: string): Promise<{ success: boolean; venta?: string; error?: string }> {
    try {
      const partes = fecha.split('-');
      if (partes.length !== 3) {
        return { success: false, error: 'Fecha debe ser aaaa-mm-dd' };
      }
      const anio = partes[0];
      const mes = String(parseInt(partes[1], 10) - 1); // SUNAT espera 0-11
      const dia = partes[2];
      const fechaLocal = `${dia}/${partes[1]}/${anio}`;

      const url = 'https://e-consulta.sunat.gob.pe/cl-at-ittipcam/tcS01Alias/listarTipoCambio';
      const reqBody = JSON.stringify({
        anio,
        mes,
        token: 't9nmgfodzadqw3j0i4ylklupor0yzk8qssf0trur4l3xylq9kkdf',
      });


      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));


      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return { success: false, error: `Error HTTP ${response.status} al consultar SUNAT` };
      }

      const text = await response.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, error: `Respuesta inválida de SUNAT: ${text.slice(0, 200)}` };
      }

      if (!Array.isArray(data) || data.length === 0) {
        return { success: false, error: 'No se encontraron tipos de cambio para ese mes' };
      }


      const item = data.find(
        (r: any) => String(r.codTipo) === 'V' && String(r.fecPublica) === fechaLocal,
      );

      if (item && item.valTipo != null) {
        return { success: true, venta: String(item.valTipo) };
      }

      const fallback = data.find((r: any) => String(r.codTipo) === 'V');
      if (fallback && fallback.valTipo != null) {
        return { success: true, venta: String(fallback.valTipo) };
      }

      return { success: false, error: 'No se encontró tipo de cambio venta' };
    } catch (err) {
      return { success: false, error: `Error al consultar SUNAT: ${err instanceof Error ? err.message : 'desconocido'}` };
    }
  }

  // ──────────────────────────────────────────────
  // Requisitos methods
  // ──────────────────────────────────────────────

  async getAssignedRequisitos(idSolicitud: string, page: number, pageSize: number): Promise<{ data: any[]; total: number }> {
    const inicio = (page - 1) * pageSize;
    const fin = pageSize;

    const totalResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_requisitos_buscant]',
      { idsolic: idSolicitud },
    );
    const total = totalResult.recordset[0] ? (Object.values(totalResult.recordset[0])[0] as number) : 0;

    const rowsResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_requisitos_solici]',
      { idsolic: idSolicitud, inicio, fin },
    );

    const data = rowsResult.recordset.map((row) => ({
      id_solicitud: String(row.id_solicitud ?? Object.values(row)[0] ?? ''),
      id_requisito: String(row.id_requisito ?? Object.values(row)[2] ?? ''),
      nombre: String(row.nombre ?? Object.values(row)[3] ?? ''),
    }));

    return { data, total };
  }

  async deleteAssignedRequisito(idSolicitud: string, idRequisito: string): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_requisitos_elim]',
      { idsolic: idSolicitud, idrequi: idRequisito },
    );
    return { success: true, message: 'Registro Eliminado' };
  }

  async getAllRequisitos(page: number, pageSize: number): Promise<{ data: any[]; total: number }> {
    const inicio = (page - 1) * pageSize;
    const fin = pageSize;

    const totalResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_requisitos_listacant]',
      {},
    );
    const total = totalResult.recordset[0] ? (Object.values(totalResult.recordset[0])[0] as number) : 0;

    const rowsResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_requisitos_listado]',
      { inicio, fin },
    );

    const data = rowsResult.recordset.map((row) => ({
      id: String(row.id ?? Object.values(row)[0] ?? ''),
      nombre: String(row.nombre ?? Object.values(row)[1] ?? ''),
    }));

    return { data, total };
  }

  // ──────────────────────────────────────────────
  // PDF Generation
  // ──────────────────────────────────────────────

  async generateSolicitudPdf(codigo: string, idSolicitud: string): Promise<Buffer> {
    const htmlPdf = require('html-pdf-node');

    const dataResult = await this.db.executeProcedure<any>(
      '[dbo].[sp_vehiculo_rptsolicitud]',
      { idcontrib: codigo, id_solicitud: idSolicitud },
    );
    const dataRow = dataResult.recordset[0];
    if (!dataRow) {
      throw new NotFoundException('Solicitud no encontrada para generar PDF');
    }

    const templateResult = await this.db.query<{ plantilla: string }>(
      "SELECT plantilla FROM Caja.Plantillas_Html WHERE id_html = 16",
    );
    const template = templateResult.recordset[0]?.plantilla;
    if (!template) {
      throw new NotFoundException('Plantilla HTML no encontrada (id_html=16)');
    }

    const trim = (v: any) => v ? String(v).trim() : '';
    const fields: Record<string, string> = {
      '@tipo_ingreso': trim(dataRow.tipo_ingreso),
      '@idcontrib': trim(dataRow.idcontrib),
      '@nombre': trim(dataRow.nombre),
      '@num_doc_contri': trim(dataRow.num_doc_contri),
      '@representante': trim(dataRow.representante),
      '@num_doc_repres': trim(dataRow.num_doc_repres),
      '@dircompleta': trim(dataRow.dircompleta),
      '@distrito': trim(dataRow.distrito),
      '@provincia': trim(dataRow.provincia),
      '@departamento': trim(dataRow.departamento),
      '@telefono1': trim(dataRow.telefono1),
      '@correo': trim(dataRow.correo),
      '@_petitorio': trim(dataRow.petitorio),
      '@_funda_hecho': trim(dataRow.funda_hecho),
      '@_funda_derecho': trim(dataRow.funda_derecho),
    };

    let html = template;
    for (const [placeholder, value] of Object.entries(fields)) {
      html = html.split(placeholder).join(value);
    }

    // Fix: override background + remove local image path that puppeteer can't load
    const pdfFixCss = `
      <style>
        html, body, header, div, table, td, th, p {
          background-color: white !important;
          color: black !important;
        }
        @page { margin: 0 !important; }
        header { color: black !important; }
        .titulo p { color: black !important; }
      </style>
    `;
    if (html.includes('</head>')) {
      html = html.replace('</head>', pdfFixCss + '</head>');
    } else {
      html = pdfFixCss + html;
    }

    // Remove local Windows image path — puppeteer can't access it
    html = html.replace(/<img[^>]*src="[^"]*FondoPantalla\.jpg"[^>]*>/gi, '');

    const file = { content: html };
    const options = {
      format: 'Letter',
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      printBackground: true,
    };

    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    return pdfBuffer;
  }

  // ──────────────────────────────────────────────
  // DJ PDF Generation
  // ──────────────────────────────────────────────

  async generateDjPdf(idDj: string, currentOperador: string = 'SISTEMA', currentEstacion: string = 'WEB'): Promise<Buffer> {
    const htmlPdf = require('html-pdf-node');
    const trim = (v: any) => v ? String(v).trim() : '';

    // 1) DJ detail — contains anio1/anio2/anio3 and their bases/taxes
    const djResult = await this.db.executeProcedure<any>(
      '[vehicular].[sp_vehiculo_djdetalle]',
      { id_dj: idDj },
    );
    const dj = djResult.recordset[0];
    if (!dj) throw new NotFoundException('DJ no encontrada');

    // Determine how many pages to render (one per active year)
    const years: { anio: string; base: number; impAnual: number }[] = [];
    const anio1 = trim(dj.anio1); const base1 = parseFloat(dj.base_imponible1) || 0; const imp1 = parseFloat(dj.imp_anual1) || 0;
    const anio2 = trim(dj.anio2); const base2 = parseFloat(dj.base_imponible2) || 0; const imp2 = parseFloat(dj.imp_anual2) || 0;
    const anio3 = trim(dj.anio3); const base3 = parseFloat(dj.base_imponible3) || 0; const imp3 = parseFloat(dj.imp_anual3) || 0;
    if (anio1) years.push({ anio: anio1, base: base1, impAnual: imp1 });
    if (anio2) years.push({ anio: anio2, base: base2, impAnual: imp2 });
    if (anio3) years.push({ anio: anio3, base: base3, impAnual: imp3 });
    // Fallback: always at least one page using anio_dj
    if (years.length === 0) years.push({ anio: trim(dj.anio_dj), base: base1, impAnual: imp1 });

    // imprimir_inicial (SP column 27) controls how many pages to print — mirrors legacy behavior
    const rawImprimir = dj.imprimir_inicial ?? Object.values(dj)[27];
    const imprimirInicial = parseInt(String(rawImprimir ?? '3'), 10);
    const yearsToRender = (!isNaN(imprimirInicial) && imprimirInicial > 0)
      ? years.slice(0, imprimirInicial)
      : years;


    const codigo = trim(dj.codigo ?? dj.idcontrib);
    const idSolicitud = trim(dj.id_solicitud);
    const idVehiculo = trim(dj.id_vehiculo);

    // 2) Contribuyente data
    const solResult = await this.db.executeProcedure<any>(
      '[dbo].[sp_vehiculo_rptsolicitud]',
      { idcontrib: codigo, id_solicitud: idSolicitud },
    );
    const sol = solResult.recordset[0] ?? {};

    // 2b) Fetch clean address and contributor type description directly
    const contribResult = await this.db.query<any>(
      `SELECT c.des_urb, c.des_via, c.manzana, c.lote, c.sub_lote, c.numero, c.departam, c.telefono1, p.tipo_detalle 
       FROM rentas.MContribuyente c
       LEFT JOIN rentas.tbltipocontri p ON c.id_tipocontri = p.id_tipocontri
       WHERE c.codigo = '${codigo}'`
    );
    const contrib = contribResult.recordset[0] ?? {};

    const parts: string[] = [];
    if (trim(contrib.des_urb)) parts.push(trim(contrib.des_urb));
    if (trim(contrib.des_via)) {
      if (parts.length > 0) {
        parts.push('- ' + trim(contrib.des_via));
      } else {
        parts.push(trim(contrib.des_via));
      }
    }
    if (trim(contrib.manzana)) parts.push('MZ. ' + trim(contrib.manzana));
    if (trim(contrib.lote)) parts.push('LOTE ' + trim(contrib.lote));
    if (trim(contrib.sub_lote)) parts.push('SUB-LOTE ' + trim(contrib.sub_lote));
    if (trim(contrib.numero)) parts.push('N° ' + trim(contrib.numero));
    if (trim(contrib.departam)) parts.push('DEP. ' + trim(contrib.departam));

    const formattedAddress = parts.join(' ');
    const telefono = trim(contrib.telefono1);

    const domicilioFiscalHtml = `<div style="display: flex; justify-content: space-between; width: 100%;">
      <span>${formattedAddress}</span>
      <span style="font-weight: bold; margin-right: 15px;">${telefono}</span>
    </div>`;

    // 3) Full vehicle data (marca nombre, modelo nombre, motor, clase, cilindrada, etc.)
    let veh: any = {};
    if (idVehiculo) {
      const vehResult = await this.db.executeProcedure<any>(
        '[vehicular].[sp_vehiculo_formregistrado]',
        { codigo: idVehiculo },
      );
      veh = vehResult.recordset[0] ?? {};
    }

    // 4) Motor type, carrocería, color names
    //    First try vehiculo table directly, then fallback to sp_vehiculo_formcombosdatos
    let vehIds: any = {};
    if (idVehiculo) {
      const idsResult = await this.db.query<any>(
        `SELECT id_motor, id_carroceria, id_color FROM vehicular.vehiculo WHERE id_vehiculo = ${Number(idVehiculo)}`
      );
      vehIds = idsResult.recordset[0] ?? {};
    }

    // Fallback: if any IDs are 0/empty, try sp_vehiculo_formcombosdatos which has these columns
    if (codigo && idVehiculo && (!vehIds.id_motor || Number(vehIds.id_motor) === 0 || !vehIds.id_carroceria || Number(vehIds.id_carroceria) === 0 || !vehIds.id_color || Number(vehIds.id_color) === 0)) {
      try {
        const comboResult = await this.db.executeProcedure<any>(
          '[vehicular].[sp_vehiculo_formcombosdatos]',
          { codigo },
        );
        const comboRow = comboResult.recordset.find((r: any) => String(r.id_vehiculo ?? '').trim() === idVehiculo);
        if (comboRow) {
          if (!vehIds.id_motor || Number(vehIds.id_motor) === 0) vehIds.id_motor = comboRow.id_motor;
          if (!vehIds.id_carroceria || Number(vehIds.id_carroceria) === 0) vehIds.id_carroceria = comboRow.id_carroceria;
          if (!vehIds.id_color || Number(vehIds.id_color) === 0) vehIds.id_color = comboRow.id_color;
        }
      } catch { /* ignore fallback errors */ }
    }

    const [motorRes, carroceriaRes, colorRes] = await Promise.all([
      vehIds.id_motor && Number(vehIds.id_motor) > 0 ? this.db.query<any>(`SELECT nombre FROM contenedor.tblvehiculomotor WHERE id_motor = ${Number(vehIds.id_motor)}`) : Promise.resolve({ recordset: [] }),
      vehIds.id_carroceria && Number(vehIds.id_carroceria) > 0 ? this.db.query<any>(`SELECT nombre FROM contenedor.tblvehiculocarroceria WHERE id_carroceria = ${Number(vehIds.id_carroceria)}`) : Promise.resolve({ recordset: [] }),
      vehIds.id_color && Number(vehIds.id_color) > 0 ? this.db.query<any>(`SELECT nombre FROM contenedor.tblvehiculocolor WHERE id_color = ${Number(vehIds.id_color)}`) : Promise.resolve({ recordset: [] }),
    ]);

    const formatFecha = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date) {
        const dd = String(v.getUTCDate()).padStart(2, '0');
        const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${v.getUTCFullYear()}`;
      }
      const s = String(v);
      if (s.includes('T') || (s.includes('-') && s.indexOf('-') === 4)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          return `${dd}/${mm}/${d.getUTCFullYear()}`;
        }
      }
      return s.split(' ')[0];
    };



    // 5) Fetch template
    const templateResult = await this.db.query<{ plantilla: string }>(
      "SELECT plantilla FROM Caja.Plantillas_Html WHERE id_html = 17",
    );
    const template = templateResult.recordset[0]?.plantilla;
    if (!template) throw new NotFoundException('Plantilla HTML no encontrada (id_html=17)');

    const tasaNum = parseFloat(dj.tasa) || 0;
    const valorReferencial = base1 + base2 + base3;

    // Shared field builder — vehicle/contributor fields are the same on every page
    const buildFields = (yearData: { anio: string; base: number; impAnual: number }): Record<string, string> => ({
      // Year-specific DJ data
      '@_anio':               yearData.anio,
      '@_estacion':           trim(currentEstacion) + (currentOperador ? '/' + trim(currentOperador) : ''),
      '@_fecha_inscrip':      formatFecha(new Date()),
      '@_baseimponible':      yearData.base.toFixed(2),
      '@_tasa':               tasaNum ? (tasaNum * 100).toFixed(2) + '%' : '0.00%',
      '@_impanual':           yearData.impAnual.toFixed(2),
      '@_imptrimestral':      yearData.impAnual > 0 ? (yearData.impAnual / 4).toFixed(2) : '0.00',

      // Contribuyente data
      '@_NOMBRE_COMPLETO':    trim(sol.nombre),
      '@_DNI':                trim(sol.num_doc_contri),
      '@_CODIGO':             trim(codigo),
      '@_TIPO_CONTRI':        contrib.tipo_detalle ? trim(contrib.tipo_detalle) : 'NATURAL',
      '@_domiciliofiscal':    domicilioFiscalHtml,

      // Vehicle data
      '@_numplaca':           trim(veh.num_placa),
      '@_nummotor':           trim(veh.num_motor),
      '@_anofabrica':         trim(veh.anio_fabrica),
      '@_marca':              trim(veh.nombre_marca),
      '@_modelo':             trim(veh.des_model_alt) || trim(veh.nombre_modelo),
      '@_categoria':          trim(veh.nombre_categoria),
      '@_clase':              trim(veh.clase),
      '@_cilindrada':         trim(veh.cilindrada),
      '@_numcilindro':        trim(veh.cilindro),
      '@_color':              trim(colorRes.recordset[0]?.nombre),
      '@_numruedas':          trim(veh.nrueda),
      '@_motor':              trim(motorRes.recordset[0]?.nombre),
      '@_carroceria':         trim(carroceriaRes.recordset[0]?.nombre),
      '@_numejes':            trim(veh.neje),
      '@_transmision':        trim(veh.transmi),
      '@_numserie':           trim(veh.nseries),
      '@_numasiento':         trim(veh.asientos),
      '@_numtarjeta':         trim(veh.num_tarjeta_prop),
      '@_fechaadqui':         formatFecha(veh.fecha_adqui),
      '@_fechainscrip':       formatFecha(veh.fecha_inscrip),
      '@_valordolares':       veh.valor_dolares ? Number(veh.valor_dolares).toFixed(2) : '0.00',
      '@_tipocambio':         veh.tipocambio ? Number(veh.tipocambio).toFixed(3) : '0.000',
      '@_valorsoles':         veh.valor_soles ? Number(veh.valor_soles).toFixed(2) : '0.00',
      '@_valorreferencial':   valorReferencial ? valorReferencial.toFixed(2) : '0.00',
    });

    // Helper: replace all placeholders in a copy of the template
    const applyFields = (tmpl: string, fields: Record<string, string>): string => {
      let html = tmpl;
      for (const [placeholder, value] of Object.entries(fields)) {
        html = html.split(placeholder).join(value);
      }
      // Fuzzy fallback
      html = html.replace(/@_?[a-zA-Z_]\w*/g, (match) => {
        const normalized = match.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [key, value] of Object.entries(fields)) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedKey === normalized) return value;
        }
        return match;
      });
      return html;
    };

    // 6) PDF fix CSS
    const pdfFixCss = `
      <style>
        html, body, header, div, table, td, th, p {
          background-color: white !important;
          color: black !important;
        }
        @page { margin: 0 !important; size: A5; }
        header { color: black !important; }
        .titulo p { color: black !important; }
        .page-break { page-break-after: always; }
      </style>
    `;

    // 7) Render one page per year and concatenate with page-break dividers
    const pageHtmlParts: string[] = yearsToRender.map((yearData, idx) => {
      const fields = buildFields(yearData);
      let pageHtml = applyFields(template, fields);

      // Inject CSS into first page only; subsequent pages just get the body content
      if (idx === 0) {
        if (pageHtml.includes('</head>')) {
          pageHtml = pageHtml.replace('</head>', pdfFixCss + '</head>');
        } else {
          pageHtml = pdfFixCss + pageHtml;
        }
        pageHtml = pageHtml.replace(/<img[^>]*src="[^"]*FondoPantalla\.jpg"[^>]*>/gi, '');
        // Wrap body content to allow page-break injection between pages
        return pageHtml.replace(/<\/body>/i, `<div class="page-break"></div></body>`);
      }

      // For subsequent pages: strip <html>/<head>/</html> wrappers, keep body content
      const bodyMatch = pageHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : pageHtml;
      const cleanBody = bodyContent.replace(/<img[^>]*src="[^"]*FondoPantalla\.jpg"[^>]*>/gi, '');
      const isLast = idx === yearsToRender.length - 1;
      return isLast
        ? `<div>${cleanBody}</div>`
        : `<div class="page-break">${cleanBody}</div>`;
    });

    // If only one year: remove the trailing page-break
    let combinedHtml: string;
    if (yearsToRender.length === 1) {
      combinedHtml = pageHtmlParts[0].replace(/<div class="page-break"><\/div><\/body>/i, '</body>');
    } else {
      // Inject subsequent pages before </body> of the first page
      const firstPage = pageHtmlParts[0];
      const extraPages = pageHtmlParts.slice(1).join('\n');
      combinedHtml = firstPage.replace(/<div class="page-break"><\/div><\/body>/i, `\n${extraPages}\n</body>`);
    }

    // Log any unreplaced placeholders
    const remaining = combinedHtml.match(/@(?!page\b)[_]?[a-zA-Z_]\w*/g);
    if (remaining) {
      const unique = [...new Set(remaining)];
    }

    const file = { content: combinedHtml };
    const options = {
      format: 'A5',
      landscape: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      printBackground: true,
    };

    return await htmlPdf.generatePdf(file, options);
  }

  async saveAssignedRequisitos(idSolicitud: string, requisitos: string[], operador: string, estacion: string): Promise<{ success: boolean }> {
    const now = new Date(); // datetime ← Date object (avoids nvarchar→datetime conversion error)

    for (const reqId of requisitos) {
      await this.db.executeProcedure<any>(
        '[vehicular].[sp_vehiculo_registro_dsol_eli]',
        { id_solicitud: idSolicitud, id_requisito: reqId }
      );

      await this.db.executeProcedure<any>(
        '[vehicular].[sp_vehiculo_registro_dsol]',
        { 
          id_solicitud: idSolicitud, 
          id_requisito: reqId, 
          estado: '1', 
          operador, 
          estacion, 
          fecha_ingreso: now  // datetime ← Date object
        }
      );
    }

    return { success: true };
  }
}
