import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConsultaCoactivoDto, GrabarEnvioCoactivoDto } from './dto/envio-a-coactivo.dto';

@Injectable()
export class EnvioCoactivoService {
  private readonly logger = new Logger(EnvioCoactivoService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta las infracciones pendientes de envío a coactivo (SP: [Papeleta].[consultainfractorcoac])
   */
  async consultarInfractorCoac(dto: ConsultaCoactivoDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
    const end = limit * page;

    try {
      const spParamsBase = {
        placa: (dto.placa || '').trim(),
        propie: (dto.propie || '').trim(),
        conduc: (dto.conductor || '').trim(),
        infrac: (dto.infrac || '').trim(),
        infracanio: (dto.infracanio || '').trim(),
        dniconduc: (dto.dniconduc || '').trim(),
      };

      // 1. Total Count (@msquery = '1')
      const resTotal = await this.db.executeProcedure('Papeleta.consultainfractorcoac', {
        msquery: '1',
        ...spParamsBase,
        start: 0,
        end: 10,
      });

      const totalRow = resTotal.recordset?.[0];
      const total = totalRow ? Number(Object.values(totalRow as any)[0] ?? 0) : 0;

      // 2. Data Rows (@msquery = '2')
      const resRows = await this.db.executeProcedure('Papeleta.consultainfractorcoac', {
        msquery: '2',
        ...spParamsBase,
        start: Number(start),
        end: Number(end),
      });

      const rawRows = resRows.recordset || [];
      const rows = rawRows.map((row: any) => {
        const numapap = String(row.numapap ?? '').trim();
        const numnpap = String(row.numnpap ?? '').trim();
        const talonario = String(row.talonario ?? '').trim();
        const infracStr = numapap ? `${numapap}-${talonario}-${numnpap}` : '';

        return {
          idtraplac: String(row.idtramplac ?? '').trim(),
          infraccion: infracStr,
          placa: String(row.codplac ?? '').trim(),
          propietario: String(row.cnomprop ?? '').trim(),
          conductor: String(row.cnomcond ?? '').trim(),
          tipovehi: String(row.desvehi ?? '').trim(),
          estado: String(row.descrip ?? row.estado ?? '').trim(),
          ninfrac: String(row.indice ?? '').trim(),
          codigo: String(row.codigocond ?? '').trim(),
          est_impresion: String(row.filtro ?? '').trim(),
          est_impresion1: String(row.filtro1 ?? '').trim(),
          codinfra: String(row.codinfr ?? '').trim(),
          fecha: String(row.fecha ?? '').trim(),
          monto: row.valpape ?? 0,
          idrecibo: String(row.idrecibo ?? '').trim(),
        };
      });

      return {
        total,
        page,
        limit,
        rows,
      };
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.logger.error(`Error en consultarInfractorCoac: ${errMsg}`, error?.stack);
      throw new InternalServerErrorException(`SQL Error: ${errMsg}`);
    }
  }

  /**
   * Buscar detalle para diálogo de envío a coactivo (SP: [Papeleta].[envioacoactivo] @msquery=1)
   */
  async buscarEnvioCoactivo(ninfrac: string) {
    try {
      const ninfracNum = parseInt(ninfrac, 10) || 0;
      const res = await this.db.executeProcedure('Papeleta.envioacoactivo', {
        msquery: 1,
        txtnumeroinfraccion: ninfracNum,
      });
      const row = res.recordset?.[0] as any;
      if (!row) {
        return null;
      }
      return {
        seriePapel: String(row.numapap ?? row.c1 ?? '').trim(),
        taloPapel: String(row.talonario ?? row.c2 ?? '').trim(),
        numeroPapel: String(row.numnpap ?? row.c3 ?? '').trim(),
        oficio: String(row.numcorr ?? row.c4 ?? '').trim(),
        fechaPapeleta: String(row.fecha ?? row.c5 ?? '').trim(),
        codigoInfraccion: String(row.codinfr ?? row.c6 ?? '').trim(),
      };
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.logger.error(`Error en buscarEnvioCoactivo: ${errMsg}`, error?.stack);
      throw new InternalServerErrorException(`SQL Error: ${errMsg}`);
    }
  }

  /**
   * Grabar el envío a coactivo (SP: [Papeleta].[envioacoactivo] @msquery=2)
   */
  async grabarEnvioCoactivo(dto: GrabarEnvioCoactivoDto, usuario: string, ws: string) {
    try {
      const ninfracNum = parseInt(dto.ninfrac, 10) || 0;
      const now = new Date();
      const currentYear = now.getFullYear();

      // 1. Limpieza de espacios en tramctas (usando sintaxis SQL Server)
      await this.db.query(
        `UPDATE papeleta.tramctas 
         SET numapap = REPLACE(numapap, ' ', ''), 
             talonario = REPLACE(talonario, ' ', ''), 
             numnpap = REPLACE(numnpap, ' ', '') 
         WHERE indice = @indice`,
        { indice: ninfracNum },
      ).catch(() => {});

      // 2. Asegurar existencia del correlativo id_valor='10' para el año actual en Contenedor.TblTipo_valor
      await this.db.query(
        `IF NOT EXISTS (SELECT 1 FROM Contenedor.TblTipo_valor WHERE id_valor = '10' AND anno_gen = @year)
         BEGIN
           INSERT INTO Contenedor.TblTipo_valor (id_valor, anno_gen, nros_gen, nomb_val)
           VALUES ('10', @year, 0, 'RESOLUCION DE SANCION COACTIVO')
         END`,
        { year: currentYear },
      ).catch(() => {});

      // 3. Formatear fecha como string 'DD/MM/YYYY HH:mm:ss' (igual al PHP legacy)
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const fechIngresoStr = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // 4. Ejecutar batch con SET ANSI_WARNINGS OFF para emular exactamente la libreria PHP legacy
      const spResult = await this.db.query(
        `SET ANSI_WARNINGS OFF;
         EXEC Papeleta.envioacoactivo 
           @msquery = 2,
           @txtnumeroinfraccion = @txtnumeroinfraccion,
           @xidusuario = @xidusuario,
           @xestacion = @xestacion,
           @xfech_ingreso = @xfech_ingreso,
           @xobservacion = @xobservacion;`,
        {
          txtnumeroinfraccion: ninfracNum,
          xidusuario: (usuario || 'SISTEMAS').slice(0, 15),
          xestacion: (ws || 'SIGMUN-API').slice(0, 15),
          xfech_ingreso: fechIngresoStr,
          xobservacion: (dto.observacion || '').slice(0, 250),
        },
      );

      // 5. Asegurar estado = '2' y area = 'CO' en tramctas
      await this.db.query(
        `UPDATE papeleta.tramctas SET area = 'CO', estado = '2' WHERE indice = @indice`,
        { indice: ninfracNum },
      );

      return {
        success: true,
        message: 'La infracción fue enviada a COACTIVO exitosamente.',
        data: { estado: '2', area: 'CO', raw: spResult.recordsets },
      };
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.logger.error(`Error en grabarEnvioCoactivo: ${errMsg}`, error?.stack);
      throw new InternalServerErrorException(`SQL Error: ${errMsg}`);
    }
  }
}
