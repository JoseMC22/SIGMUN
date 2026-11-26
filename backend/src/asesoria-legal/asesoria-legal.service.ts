import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CrearSolicitudDto } from './solicitud/dto/solicitud.dto';
// Usar require directo para evitar que Babel/tsc inserte .default en CommonJS
const PDFDocument = require('pdfkit');

@Injectable()
export class AsesoriaLegalService {
  private readonly logger = new Logger(AsesoriaLegalService.name);

  constructor(private readonly db: DatabaseService) { }

  // 1. Obtener trámites de Bomberos mediante Stored Procedure en SIGMUN o Query Directa con Tributos 1:N
  async getTramitesBomberos(
    fFecDesde?: string,
    fFecHasta?: string,
    ccodigo?: string,
    cCodificacion?: string,
    cEstadoLegal?: string,
  ) {
    let rows: any[] = [];
    try {
      const result = await this.db.executeProcedure('Legal.sp_Legal_BuscarTramitesBomberos', {
        fFecDesde: fFecDesde || '',
        fFecHasta: fFecHasta || '',
        ccodigo: ccodigo || '',
        cCodificacion: cCodificacion || '',
        cEstadoLegal: cEstadoLegal || '',
      });
      rows = result.recordset ?? [];
    } catch (error) {
      // Fallback a query directa
      const params: Record<string, any> = {};
      let query = `
        SELECT TOP 200
          t.iCodTramite,
          t.cCodificacion,
          t.cCodificacion AS nro_tramite,
          t.ccodigo,
          t.ccodigo AS codigo_contribuyente,
          CAST(t.cAsunto AS VARCHAR(MAX)) AS cAsunto,
          t.cObservaciones,
          t.fFecRegistro,
          t.AnoDesde AS fFecDesde,
          t.AnoHasta AS fFecHasta,
          ISNULL(r.cNombre, t.ccodigo) AS nombre_contribuyente,
          ISNULL(r.nNumDocumento, '') AS doc_contribuyente
        FROM db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite t WITH (NOLOCK)
        LEFT JOIN db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Remitente r WITH (NOLOCK)
          ON t.iCodRemitente = r.iCodRemitente
        WHERE 1=1
      `;

      if (fFecDesde) {
        query += ` AND CAST(t.fFecRegistro AS DATE) >= @fFecDesde`;
        params.fFecDesde = fFecDesde;
      }
      if (fFecHasta) {
        query += ` AND CAST(t.fFecRegistro AS DATE) <= @fFecHasta`;
        params.fFecHasta = fFecHasta;
      }
      if (ccodigo) {
        query += ` AND t.ccodigo LIKE '%' + @ccodigo + '%'`;
        params.ccodigo = ccodigo;
      }
      if (cCodificacion) {
        query += ` AND t.cCodificacion LIKE '%' + @cCodificacion + '%'`;
        params.cCodificacion = cCodificacion;
      }

      query += ` ORDER BY t.fFecRegistro DESC`;

      const res = await this.db.queryWithParams(query, params);
      rows = res.recordset ?? [];
    }

    // Complementar con Tra_M_Tramite_Tributos (1:N)
    if (rows.length > 0) {
      try {
        const codigosTramite = Array.from(new Set(rows.map((r) => r.iCodTramite).filter(Boolean)));
        if (codigosTramite.length > 0) {
          const listParam = codigosTramite.join(',');
          const queryTributos = `
            SELECT iCodTramiteTributo, iCodTramite, codigo, cTipoTributo, nAnoDesde, nAnoHasta
            FROM db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite_Tributos WITH (NOLOCK)
            WHERE iCodTramite IN (${listParam})
            ORDER BY iCodTramite, cTipoTributo ASC
          `;
          const resTributos = await this.db.queryWithParams(queryTributos, {});
          const tributosMap = new Map<number, any[]>();
          (resTributos.recordset ?? []).forEach((trib: any) => {
            if (!tributosMap.has(trib.iCodTramite)) {
              tributosMap.set(trib.iCodTramite, []);
            }
            tributosMap.get(trib.iCodTramite)!.push({
              iCodTramiteTributo: trib.iCodTramiteTributo,
              codigo: trib.codigo,
              cTipoTributo: trib.cTipoTributo,
              nAnoDesde: trib.nAnoDesde,
              nAnoHasta: trib.nAnoHasta,
            });
          });

          rows.forEach((r) => {
            const lista = tributosMap.get(r.iCodTramite) || [];
            r.tributos = lista;
          });
        }
      } catch (err) {
        this.logger.warn('No se pudo consultar Tra_M_Tramite_Tributos en getTramitesBomberos (usando fallback plano):', err);
        rows.forEach((r) => {
          r.tributos = [];
        });
      }
    }

    return rows;
  }

  // 2. Crear solicitud de información a oficinas (Legal.Legal_Solicitud)
  async crearSolicitud(dto: CrearSolicitudDto, usuarioActual: string) {
    const { iCodTramite, cCodificacion, ccodigo, cObservacionLegal, fFecDesde, fFecHasta, iCodTrabajadorSolicita, oficinasDestino } = dto;

    try {
      // Obtener datos complementarios del trámite en Bomberos si es necesario
      let codigoContribuyente = ccodigo || '';
      let anioDesde = fFecDesde ? String(fFecDesde).substring(0, 4) : null;
      let anioHasta = fFecHasta ? String(fFecHasta).substring(0, 4) : null;

      if ((!codigoContribuyente || !anioDesde || !anioHasta) && iCodTramite) {
        const queryTramite = `
          SELECT ccodigo, AnoDesde AS fFecDesde, AnoHasta AS fFecHasta 
          FROM db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite WITH (NOLOCK) 
          WHERE iCodTramite = @iCodTramite
        `;
        const resTramite = await this.db.queryWithParams<{ ccodigo: string; fFecDesde?: string; fFecHasta?: string }>(queryTramite, { iCodTramite });
        const tramiteDb = resTramite.recordset[0];
        if (tramiteDb) {
          if (!codigoContribuyente) codigoContribuyente = tramiteDb.ccodigo || '';
          if (!anioDesde && tramiteDb.fFecDesde) anioDesde = String(tramiteDb.fFecDesde).substring(0, 4);
          if (!anioHasta && tramiteDb.fFecHasta) anioHasta = String(tramiteDb.fFecHasta).substring(0, 4);
        }
      }

      // Insertar Cabecera de Solicitud Legal en Legal.Legal_Solicitud
      const queryCabecera = `
        INSERT INTO [Legal].[Legal_Solicitud] (
          iCodTramite, cNroTramite, cCodigoContribuyente,
          fFecDesde, fFecHasta,
          iCodTrabajadorSolicita, fFecSolicitud, cObservacion, nFlgEstado
        )
        OUTPUT INSERTED.iCodSolicitud
        VALUES (
          @iCodTramite, @cNroTramite, @cCodigoContribuyente,
          @fFecDesde, @fFecHasta,
          @iCodTrabajadorSolicita, GETDATE(), @cObservacion, 1
        );
      `;

      const resCabecera = await this.db.queryWithParams<{ iCodSolicitud: number }>(queryCabecera, {
        iCodTramite,
        cNroTramite: cCodificacion,
        cCodigoContribuyente: codigoContribuyente,
        fFecDesde: anioDesde || null,
        fFecHasta: anioHasta || null,
        iCodTrabajadorSolicita: parseInt(iCodTrabajadorSolicita || '1', 10),
        cObservacion: cObservacionLegal || null,
      });

      const iCodSolicitud = resCabecera.recordset[0]?.iCodSolicitud;

      // Insertar Detalle por Oficina en Legal.Legal_Solicitud_Oficina
      for (const ofi of oficinasDestino) {
        const queryDetalle = `
          INSERT INTO [Legal].[Legal_Solicitud_Oficina] (
            iCodSolicitud, iCodOficina, fFecEnvio, nFlgEstado, cObservacion
          )
          VALUES (
            @iCodSolicitud, @iCodOficina, GETDATE(), 1, @cObservacion
          );
        `;

        await this.db.queryWithParams(queryDetalle, {
          iCodSolicitud,
          iCodOficina: parseInt(ofi.cCodAreaDestino || '1', 10),
          cObservacion: ofi.cDetalleSolicitud || null,
        });
      }

      return { success: true, message: 'Solicitud de información registrada exitosamente', iCodSolicitud };
    } catch (error) {
      this.logger.error('Error al crear solicitud legal:', error);
      throw error;
    }
  }

  // 3. Consultar Estado de Solicitudes (con filtro opcional de oficina)
  async getEstadoSolicitudes(iCodTramite?: number, cCodificacion?: string, iCodOficina?: number) {
    let query = `
      SELECT 
        s.iCodSolicitud,
        s.iCodTramite,
        s.cNroTramite AS cCodificacion,
        ISNULL(
          NULLIF(NULLIF(s.cCodigoContribuyente, s.cNroTramite), ''),
          ISNULL(tb.ccodigo, '-')
        ) AS ccodigo,
        s.cObservacion AS cObservacionLegal,
        s.fFecSolicitud,
        s.fFecDesde,
        s.fFecHasta,
        tb.AnoDesde,
        tb.AnoHasta,
        CAST(tb.cAsunto AS VARCHAR(MAX)) AS cAsunto,
        ISNULL(rem.cNombre, tb.ccodigo) AS nombre_contribuyente,
        CASE WHEN s.nFlgEstado = 1 THEN 'PENDIENTE' ELSE 'ATENDIDO' END AS cEstadoCabecera,
        so.iCodSolicitudOficina,
        so.iCodOficina,
        so.nFlgEstado AS nFlgEstadoOficina,
        so.nFlgEstado,
        CASE 
          WHEN so.nFlgEstado = 3 THEN 'CONFORME'
          WHEN so.nFlgEstado = 4 THEN 'OBSERVADO'
          WHEN r.iCodRespuesta IS NOT NULL OR so.nFlgEstado = 2 THEN 'RESPONDIDO'
          ELSE 'PENDIENTE'
        END AS cEstadoOficina,
        CASE 
          WHEN so.iCodOficina = 1 THEN 'Cobranza'
          WHEN so.iCodOficina = 2 THEN 'Registro'
          WHEN so.iCodOficina = 3 THEN 'Coactivo'
          ELSE 'Oficina ' + CAST(so.iCodOficina AS VARCHAR)
        END AS cCodAreaDestino,
        so.cObservacion AS cDetalleSolicitud,
        so.fFecEnvio,
        r.iCodRespuesta,
        r.fFecRespuesta,
        r.cRespuesta,
        r.cNombreArchivo,
        r.cRutaArchivo,
        CAST(r.iCodTrabajadorRespuesta AS VARCHAR) AS cUsuarioRespuesta
      FROM [Legal].[Legal_Solicitud] s WITH (NOLOCK)
      INNER JOIN [Legal].[Legal_Solicitud_Oficina] so WITH (NOLOCK) ON s.iCodSolicitud = so.iCodSolicitud
      LEFT JOIN (
        SELECT r1.*,
               ROW_NUMBER() OVER (PARTITION BY r1.iCodSolicitudOficina ORDER BY r1.iCodRespuesta DESC) AS rn
        FROM [Legal].[Legal_Respuesta] r1 WITH (NOLOCK)
      ) r ON so.iCodSolicitudOficina = r.iCodSolicitudOficina AND r.rn = 1
      LEFT JOIN db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite tb WITH (NOLOCK) ON s.iCodTramite = tb.iCodTramite
      LEFT JOIN db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Remitente rem WITH (NOLOCK) ON tb.iCodRemitente = rem.iCodRemitente
      WHERE 1=1
    `;
    const params: Record<string, any> = {};

    if (iCodTramite) {
      query += ` AND s.iCodTramite = @iCodTramite`;
      params.iCodTramite = iCodTramite;
    }
    if (cCodificacion) {
      query += ` AND s.cNroTramite = @cCodificacion`;
      params.cCodificacion = cCodificacion;
    }
    if (iCodOficina !== undefined && iCodOficina !== null && !isNaN(Number(iCodOficina))) {
      query += ` AND so.iCodOficina = @iCodOficina`;
      params.iCodOficina = Number(iCodOficina);
    }

    query += ` ORDER BY s.fFecSolicitud DESC`;

    const res = await this.db.queryWithParams(query, params);
    const rows = res.recordset ?? [];

    // Complementar con los tributos asociados al trámite (Tra_M_Tramite_Tributos)
    if (rows.length > 0) {
      try {
        const codigosTramite = Array.from(new Set(rows.map((r: any) => r.iCodTramite).filter(Boolean)));
        if (codigosTramite.length > 0) {
          const listParam = codigosTramite.join(',');
          const queryTributos = `
            SELECT iCodTramiteTributo, iCodTramite, codigo, cTipoTributo, nAnoDesde, nAnoHasta
            FROM db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite_Tributos WITH (NOLOCK)
            WHERE iCodTramite IN (${listParam})
            ORDER BY iCodTramite, cTipoTributo ASC
          `;
          const resTributos = await this.db.queryWithParams(queryTributos, {});
          const tributosMap = new Map<number, any[]>();
          (resTributos.recordset ?? []).forEach((trib: any) => {
            if (!tributosMap.has(trib.iCodTramite)) {
              tributosMap.set(trib.iCodTramite, []);
            }
            tributosMap.get(trib.iCodTramite)!.push({
              iCodTramiteTributo: trib.iCodTramiteTributo,
              codigo: trib.codigo,
              cTipoTributo: trib.cTipoTributo,
              nAnoDesde: trib.nAnoDesde,
              nAnoHasta: trib.nAnoHasta,
            });
          });

          rows.forEach((r: any) => {
            r.tributos = tributosMap.get(r.iCodTramite) || [];
          });
        }
      } catch (err) {
        this.logger.warn('No se pudo consultar Tra_M_Tramite_Tributos en getEstadoSolicitudes:', err);
        rows.forEach((r: any) => {
          r.tributos = [];
        });
      }
    }

    return rows;
  }

  // 4. Responder a una solicitud (Legal.Legal_Respuesta) - SIEMPRE INSERT para mantener historial
  async responderSolicitud(
    iCodSolicitudOficina: number,
    cRespuesta: string,
    usuarioActual: string,
    cNombreArchivo?: string | null,
    cRutaArchivo?: string | null,
  ) {
    const parsedId = parseInt(usuarioActual, 10);
    const iCodTrabajadorRespuesta = !isNaN(parsedId) ? parsedId : 1;

    // 1. Verificar estado en Legal_Solicitud_Oficina (no se puede editar si ya fue dado por CONFORME = 3)
    const checkStateQuery = `
      SELECT nFlgEstado FROM [Legal].[Legal_Solicitud_Oficina] WITH (NOLOCK)
      WHERE iCodSolicitudOficina = @iCodSolicitudOficina
    `;
    const stateRes = await this.db.queryWithParams<{ nFlgEstado: number }>(checkStateQuery, {
      iCodSolicitudOficina: Number(iCodSolicitudOficina),
    });
    const currentEstado = stateRes.recordset[0]?.nFlgEstado;

    if (currentEstado === 3) {
      throw new BadRequestException('Esta respuesta ya recibió el Visto Bueno / Conformidad de Asesoría Legal y no se puede modificar.');
    }

    // 2. Insertar SIEMPRE nuevo registro incremental en Legal_Respuesta para mantener el historial
    const query = `
      INSERT INTO [Legal].[Legal_Respuesta] (
        iCodSolicitudOficina, iCodTrabajadorRespuesta, fFecRespuesta, cRespuesta, cNombreArchivo, cRutaArchivo
      )
      VALUES (
        @iCodSolicitudOficina, @iCodTrabajadorRespuesta, GETDATE(), @cRespuesta, @cNombreArchivo, @cRutaArchivo
      );
    `;

    await this.db.queryWithParams(query, {
      iCodSolicitudOficina: Number(iCodSolicitudOficina),
      iCodTrabajadorRespuesta,
      cRespuesta,
      cNombreArchivo: cNombreArchivo || null,
      cRutaArchivo: cRutaArchivo || null,
    });

    // 3. Cambiar estado de la solicitud de oficina a 2 = RESPONDIDO
    await this.db.queryWithParams(
      `UPDATE [Legal].[Legal_Solicitud_Oficina] SET nFlgEstado = 2, fFecRecepcion = GETDATE() WHERE iCodSolicitudOficina = @iCodSolicitudOficina`,
      { iCodSolicitudOficina: Number(iCodSolicitudOficina) },
    );

    return { success: true, message: 'Respuesta registrada correctamente' };
  }

  // 5. Editar observaciones de una solicitud (Solo si NINGUNA oficina ha respondido aún)
  async actualizarSolicitud(
    iCodSolicitud: number,
    cObservacionLegal?: string,
    oficinasDestino?: Array<{ cCodAreaDestino: string; cDetalleSolicitud: string }>,
  ) {
    // 1. Validar si ya hay alguna respuesta registrada
    const checkQuery = `
      SELECT COUNT(*) AS totalRespuestas
      FROM [Legal].[Legal_Solicitud_Oficina] so WITH (NOLOCK)
      INNER JOIN [Legal].[Legal_Respuesta] r WITH (NOLOCK) ON so.iCodSolicitudOficina = r.iCodSolicitudOficina
      WHERE so.iCodSolicitud = @iCodSolicitud
    `;
    const checkRes = await this.db.queryWithParams<{ totalRespuestas: number }>(checkQuery, { iCodSolicitud });
    const totalRespuestas = checkRes.recordset[0]?.totalRespuestas || 0;

    if (totalRespuestas > 0) {
      throw new BadRequestException('No se puede editar la solicitud porque una o más oficinas ya han respondido.');
    }

    // 2. Actualizar cabecera
    const queryCabecera = `
      UPDATE [Legal].[Legal_Solicitud]
      SET cObservacion = @cObservacionLegal
      WHERE iCodSolicitud = @iCodSolicitud
    `;
    await this.db.queryWithParams(queryCabecera, {
      iCodSolicitud,
      cObservacionLegal: cObservacionLegal || null,
    });

    // 3. Actualizar detalles por oficina si se enviaron
    if (oficinasDestino && oficinasDestino.length > 0) {
      for (const ofi of oficinasDestino) {
        const queryOficina = `
          UPDATE [Legal].[Legal_Solicitud_Oficina]
          SET cObservacion = @cDetalleSolicitud
          WHERE iCodSolicitud = @iCodSolicitud AND iCodOficina = @iCodOficina
        `;
        await this.db.queryWithParams(queryOficina, {
          iCodSolicitud,
          iCodOficina: parseInt(ofi.cCodAreaDestino || '1', 10),
          cDetalleSolicitud: ofi.cDetalleSolicitud || null,
        });
      }
    }

    return { success: true, message: 'Solicitud actualizada correctamente' };
  }

  // 6. Evaluar Respuesta de Oficina por parte de Legal (3 = CONFORME / Visto Bueno, 4 = OBSERVADO / Pedir Corrección)
  async evaluarRespuestaOficina(
    iCodSolicitudOficina: number,
    nFlgEstado: number,
    cNotaObservacion?: string,
  ) {
    if (nFlgEstado !== 3 && nFlgEstado !== 4) {
      throw new BadRequestException('Estado de evaluación inválido. Debe ser 3 (Conforme) o 4 (Observado).');
    }

    const query = `
      UPDATE [Legal].[Legal_Solicitud_Oficina]
      SET nFlgEstado = @nFlgEstado,
          cObservacion = CASE WHEN @cNotaObservacion IS NOT NULL THEN @cNotaObservacion ELSE cObservacion END
      WHERE iCodSolicitudOficina = @iCodSolicitudOficina;
    `;

    await this.db.queryWithParams(query, {
      iCodSolicitudOficina: Number(iCodSolicitudOficina),
      nFlgEstado,
      cNotaObservacion: cNotaObservacion || null,
    });

    const msg =
      nFlgEstado === 3
        ? 'Conformidad / Visto Bueno otorgado exitosamente.'
        : 'Respuesta observada. Se ha solicitado la corrección a la oficina.';
    return { success: true, message: msg };
  }

  // 7. Historial de respuestas por iCodSolicitudOficina
  async getHistorialRespuestas(iCodSolicitudOficina: number) {
    const query = `
      SELECT 
        r.iCodRespuesta,
        r.iCodSolicitudOficina,
        r.fFecRespuesta,
        r.cRespuesta,
        r.cNombreArchivo,
        r.cRutaArchivo,
        CAST(r.iCodTrabajadorRespuesta AS VARCHAR) AS cUsuarioRespuesta
      FROM [Legal].[Legal_Respuesta] r WITH (NOLOCK)
      WHERE r.iCodSolicitudOficina = @iCodSolicitudOficina
      ORDER BY r.iCodRespuesta DESC;
    `;
    const res = await this.db.queryWithParams(query, { iCodSolicitudOficina: Number(iCodSolicitudOficina) });
    return res.recordset;
  }

  // 8. Generar Informe Consolidado en PDF para expediente
  async generarPdfConsolidado(iCodSolicitud: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      this.logger.log(`Iniciando generación de PDF consolidado para solicitud: ${iCodSolicitud}`);
      // 1. Obtener cabecera de la solicitud
      const reqHeader = await this.db.queryWithParams<any>(`
      SELECT 
        s.iCodSolicitud,
        s.iCodTramite,
        s.cNroTramite,
        ISNULL(NULLIF(NULLIF(s.cCodigoContribuyente, s.cNroTramite), ''), ISNULL(tb.ccodigo, '-')) AS cCodigoContribuyente,
        s.fFecDesde,
        s.fFecHasta,
        s.fFecSolicitud,
        CAST(s.cObservacion AS VARCHAR(MAX)) AS cObservacionLegal,
        s.nFlgEstado AS nFlgEstadoCabecera,
        s.iCodTrabajadorSolicita,
        CAST(s.iCodTrabajadorSolicita AS VARCHAR) AS cNombreTrabajadorSolicita,
        CAST(tb.cAsunto AS VARCHAR(MAX)) AS cAsunto,
        CAST(tb.cObservaciones AS VARCHAR(MAX)) AS cObservacionesTramite,
        tb.fFecRegistro AS fFecRegistroTramite,
        tb.AnoDesde,
        tb.AnoHasta,
        ISNULL(rem.cNombre, tb.ccodigo) AS cNombreRemitente,
        ISNULL(rem.nNumDocumento, '') AS cDocRemitente
      FROM [Legal].[Legal_Solicitud] s WITH (NOLOCK)
      LEFT JOIN db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite tb WITH (NOLOCK) ON s.iCodTramite = tb.iCodTramite
      LEFT JOIN db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Remitente rem WITH (NOLOCK) ON tb.iCodRemitente = rem.iCodRemitente
      WHERE s.iCodSolicitud = @iCodSolicitud
    `, { iCodSolicitud });

    const solicitud = reqHeader.recordset[0];
    if (!solicitud) {
      throw new NotFoundException('Solicitud legal no encontrada');
    }

    // 2. Obtener tributos asociados al trámite
    let tributos: any[] = [];
    if (solicitud.iCodTramite) {
      try {
        const resTrib = await this.db.queryWithParams<any>(`
          SELECT cTipoTributo, nAnoDesde, nAnoHasta
          FROM db_pcm_gob_pe_std_bomberos.dbo.Tra_M_Tramite_Tributos WITH (NOLOCK)
          WHERE iCodTramite = @iCodTramite
          ORDER BY cTipoTributo ASC
        `, { iCodTramite: solicitud.iCodTramite });
        tributos = resTrib.recordset || [];
      } catch (e) {
        this.logger.warn('No se pudieron obtener tributos para PDF:', e);
      }
    }

    // 3. Obtener las oficinas y sus respuestas
    const reqOficinas = await this.db.queryWithParams<any>(`
      SELECT 
        so.iCodSolicitudOficina,
        so.iCodOficina,
        so.nFlgEstado AS nFlgEstadoOficina,
        CAST(so.cObservacion AS VARCHAR(MAX)) AS cDetalleSolicitud,
        so.fFecEnvio,
        CASE 
          WHEN so.iCodOficina = 1 THEN 'Oficina de Cobranza'
          WHEN so.iCodOficina = 2 THEN 'Oficina de Registro y Fiscalización'
          WHEN so.iCodOficina = 3 THEN 'Oficina de Ejecutoría Coactiva'
          ELSE 'Oficina ' + CAST(so.iCodOficina AS VARCHAR)
        END AS cNombreOficina,
        r.iCodRespuesta,
        r.fFecRespuesta,
        CAST(r.cRespuesta AS VARCHAR(MAX)) AS cRespuesta,
        r.cNombreArchivo,
        r.cRutaArchivo,
        CAST(r.iCodTrabajadorRespuesta AS VARCHAR) AS cNombreTrabajadorRespuesta
      FROM [Legal].[Legal_Solicitud_Oficina] so WITH (NOLOCK)
      LEFT JOIN (
        SELECT r1.*,
               ROW_NUMBER() OVER (PARTITION BY r1.iCodSolicitudOficina ORDER BY r1.iCodRespuesta DESC) AS rn
        FROM [Legal].[Legal_Respuesta] r1 WITH (NOLOCK)
      ) r ON so.iCodSolicitudOficina = r.iCodSolicitudOficina AND r.rn = 1
      WHERE so.iCodSolicitud = @iCodSolicitud
      ORDER BY so.iCodOficina ASC
    `, { iCodSolicitud });

    const oficinas = reqOficinas.recordset || [];
    const todasConformes = oficinas.length > 0 && oficinas.every((o: any) => o.nFlgEstadoOficina === 3);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 35, bottom: 45, left: 35, right: 35 },
          bufferPages: true,
          autoFirstPage: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const cleanCod = String(solicitud.cNroTramite || solicitud.iCodSolicitud).replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `Informe_Consolidado_Legal_${cleanCod}.pdf`;
          resolve({ buffer, filename });
        });
        doc.on('error', reject);

        const leftMargin = 35;
        const pageWidth = 525.28;
        let currentY = 35;

        const formatFecha = (d: any) => {
          if (!d) return '-';
          const date = new Date(d);
          if (isNaN(date.getTime())) return String(d);
          return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        };

        const formatFechaHora = (d: any) => {
          if (!d) return '-';
          const date = new Date(d);
          if (isNaN(date.getTime())) return String(d);
          return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        };

        const ensureSpace = (neededHeight: number) => {
          if (currentY + neededHeight > 760) {
            doc.addPage();
            currentY = 35;
          }
        };

        // Encabezado
        doc.rect(leftMargin, currentY, pageWidth, 42).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text('MUNICIPALIDAD PROVINCIAL / SISTEMA SIGMUN', leftMargin + 10, currentY + 8, { width: pageWidth - 20, align: 'center' });
        doc.fontSize(8.5).font('Helvetica').fillColor('#94A3B8').text('OFICINA DE ASESORÍA LEGAL — INFORME TÉCNICO CONSOLIDADO DE EXPEDIENTE', leftMargin + 10, currentY + 24, { width: pageWidth - 20, align: 'center' });
        currentY += 48;

        // Datos del expediente
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text('1. INFORMACIÓN GENERAL DEL EXPEDIENTE', leftMargin, currentY);
        currentY += 13;

        const boxH = 75;
        doc.roundedRect(leftMargin, currentY, pageWidth, boxH, 3).strokeColor('#CBD5E1').lineWidth(0.8).stroke();

        const col1 = leftMargin + 8;
        const col2 = leftMargin + 180;
        const col3 = leftMargin + 360;
        let yInfo = currentY + 6;

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('N° Expediente / Trámite:', col1, yInfo);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text(solicitud.cNroTramite || '-', col1, yInfo + 10);

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Cód. Contribuyente:', col2, yInfo);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0284C7').text(solicitud.cCodigoContribuyente || '-', col2, yInfo + 10);

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Fecha de Solicitud Legal:', col3, yInfo);
        doc.fontSize(8).font('Helvetica').fillColor('#334155').text(formatFechaHora(solicitud.fFecSolicitud), col3, yInfo + 10);

        yInfo += 24;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Contribuyente / Remitente:', col1, yInfo);
        doc.fontSize(8).font('Helvetica').fillColor('#1E293B').text(`${solicitud.cNombreRemitente || '-'} ${solicitud.cDocRemitente ? `(${solicitud.cDocRemitente})` : ''}`, col1, yInfo + 10, { width: 340 });

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Períodos / Años Solicitados:', col3, yInfo);
        const aniosTexto = tributos.length > 0 
          ? tributos.map(t => `${t.cTipoTributo}: ${t.nAnoDesde}-${t.nAnoHasta ?? 'Act'}`).join(' | ')
          : `${solicitud.AnoDesde || solicitud.fFecDesde || '-'} a ${solicitud.AnoHasta || solicitud.fFecHasta || '-'}`;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#B45309').text(aniosTexto, col3, yInfo + 10, { width: 155 });

        yInfo += 24;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text('Asunto del Trámite:', col1, yInfo);
        doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(solicitud.cAsunto || '-', col1, yInfo + 9, { width: pageWidth - 20, height: 16 });

        currentY += boxH + 10;

        // Pronunciamiento de Oficinas
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text('2. PRONUNCIAMIENTOS E INFORMES DE ÁREAS TÉCNICAS', leftMargin, currentY);
        currentY += 13;

        for (const ofi of oficinas) {
          ensureSpace(90);
          const isConforme = ofi.nFlgEstadoOficina === 3;
          const isObservado = ofi.nFlgEstadoOficina === 4;
          const isRespondido = ofi.iCodRespuesta || ofi.nFlgEstadoOficina === 2;

          let badgeColor = '#64748B';
          let badgeText = 'PENDIENTE DE RESPUESTA';
          if (isConforme) { badgeColor = '#16A34A'; badgeText = 'VISTO BUENO / CONFORME'; }
          else if (isObservado) { badgeColor = '#D97706'; badgeText = 'OBSERVADO POR LEGAL'; }
          else if (isRespondido) { badgeColor = '#0284C7'; badgeText = 'RESPUESTA EMITIDA'; }

          doc.rect(leftMargin, currentY, pageWidth, 18).fill('#F8FAFC');
          doc.strokeColor('#E2E8F0').lineWidth(0.8).rect(leftMargin, currentY, pageWidth, 18).stroke();
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#1E293B').text(ofi.cNombreOficina.toUpperCase(), leftMargin + 8, currentY + 5);
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor(badgeColor).text(badgeText, leftMargin + pageWidth - 160, currentY + 5, { width: 152, align: 'right' });
          currentY += 18;

          const detalleY = currentY;
          doc.rect(leftMargin, detalleY, pageWidth, 60).fill('#FFFFFF');
          doc.strokeColor('#E2E8F0').lineWidth(0.8).rect(leftMargin, detalleY, pageWidth, 60).stroke();

          doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748B').text('Requerimiento formulado:', leftMargin + 8, detalleY + 4);
          doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(ofi.cDetalleSolicitud || 'Sin requerimiento específico.', leftMargin + 8, detalleY + 12, { width: pageWidth - 16, height: 16 });

          doc.fontSize(7).font('Helvetica-Bold').fillColor('#0284C7').text(`Respuesta técnica de ${ofi.cNombreOficina} (${formatFechaHora(ofi.fFecRespuesta)}):`, leftMargin + 8, detalleY + 28);
          doc.fontSize(7.5).font('Helvetica').fillColor('#0F172A').text(ofi.cRespuesta || 'No se ha registrado informe técnico para esta área.', leftMargin + 8, detalleY + 36, { width: pageWidth - 16, height: 20 });

          currentY += 66;
        }

        // Conclusión Jurídica
        ensureSpace(100);
        currentY += 4;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text('3. DILIGENCIA Y CONFORMIDAD DE ASESORÍA LEGAL', leftMargin, currentY);
        currentY += 13;

        const conclusionText = todasConformes
          ? 'CONFORMIDAD TOTAL ALCANZADA: Las áreas técnicas requeridas han remitido sus respectivos pronunciamientos con Visto Bueno favorable de Asesoría Legal. El presente expediente se consolida para la prosecución del trámite y emisión de la resolución correspondiente.'
          : 'EN PROCESO DE EVALUACIÓN / ATENCIÓN: El expediente cuenta con áreas técnicas pendientes de respuesta o con observaciones pendientes de subsanación. El presente documento certifica el estado situacional a la fecha de emisión.';

        doc.roundedRect(leftMargin, currentY, pageWidth, 34, 3).fillAndStroke(todasConformes ? '#F0FDF4' : '#FFFBEB', todasConformes ? '#86EFAC' : '#FCD34D');
        doc.font('Helvetica').fontSize(7.5).fillColor(todasConformes ? '#166534' : '#92400E').text(conclusionText, leftMargin + 8, currentY + 5, { width: pageWidth - 16 });
        currentY += 45;

        // Firmas
        ensureSpace(65);
        const firmaY = currentY + 24;
        const fWidth = 170;
        const f1X = leftMargin + 40;
        const f2X = leftMargin + pageWidth - fWidth - 40;

        doc.strokeColor('#94A3B8').lineWidth(0.8).moveTo(f1X, firmaY).lineTo(f1X + fWidth, firmaY).stroke();
        doc.strokeColor('#94A3B8').lineWidth(0.8).moveTo(f2X, firmaY).lineTo(f2X + fWidth, firmaY).stroke();

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text('ABOGADO(A) INFORMANTE', f1X, firmaY + 3, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Oficina de Asesoría Legal', f1X, firmaY + 12, { width: fWidth, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text('DIRECTOR(A) DE ASESORÍA LEGAL', f2X, firmaY + 3, { width: fWidth, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Visto Bueno y Conformidad', f2X, firmaY + 12, { width: fWidth, align: 'center' });

        // Pie de página en todas las hojas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(leftMargin, 795).lineTo(leftMargin + pageWidth, 795).stroke();
          doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text(
            `Página ${i + 1} de ${pages.count} — Expediente N° ${solicitud.cNroTramite || '-'} — SIGMUN Asesoría Legal`,
            leftMargin,
            802,
            { align: 'center', width: pageWidth }
          );
        }

        doc.end();
      } catch (err) {
        this.logger.error(`Error generando PDF en doc callback:`, err);
        reject(err);
      }
    });
    } catch (error) {
      this.logger.error(`Error general al generar PDF consolidado ${iCodSolicitud}:`, error);
      throw error;
    }
  }
}


