import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CrearSolicitudDto } from './solicitud/dto/solicitud.dto';

@Injectable()
export class AsesoriaLegalService {
  private readonly logger = new Logger(AsesoriaLegalService.name);

  constructor(private readonly db: DatabaseService) { }

  // 1. Obtener trámites de Bomberos mediante Stored Procedure en SIGMUN
  async getTramitesBomberos(
    fFecDesde?: string,
    fFecHasta?: string,
    ccodigo?: string,
    cCodificacion?: string,
    cEstadoLegal?: string,
  ) {
    try {
      const result = await this.db.executeProcedure('Legal.sp_Legal_BuscarTramitesBomberos', {
        fFecDesde: fFecDesde || '',
        fFecHasta: fFecHasta || '',
        ccodigo: ccodigo || '',
        cCodificacion: cCodificacion || '',
        cEstadoLegal: cEstadoLegal || '',
      });
      return result.recordset ?? [];
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
          t.fFecDesde,
          t.fFecHasta,
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
      return res.recordset;
    }
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
          SELECT ccodigo, fFecDesde, fFecHasta 
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
    return res.recordset;
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
}

