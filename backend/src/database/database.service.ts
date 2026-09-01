import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as mssql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: mssql.ConnectionPool;

  private readonly config: mssql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 60000,
    connectionTimeout: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || '15000',
      10,
    ),
  };

  async onModuleInit() {
    try {
      this.pool = await new mssql.ConnectionPool(this.config).connect();
      this.logger.log(
        'Conexión a SQL Server establecida exitosamente (mssql pool).',
      );
    } catch (err) {
      this.logger.error('Error al conectar con SQL Server:', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('Conexión a SQL Server cerrada.');
    }
  }

  /**
   * Maps a JS value to the appropriate SQL type for parameter binding.
   * Uses VarChar (not NVarChar) by default to match PHP sqlsrv behavior
   * and avoid implicit conversions that kill index usage.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inferSqlType(value: any): any {
    if (value === null || value === undefined) {
      return mssql.VarChar(25);
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? mssql.Int : mssql.Float;
    }
    if (typeof value === 'boolean') {
      return mssql.Bit;
    }
    if (value instanceof Date) {
      return mssql.DateTime2;
    }
    // Use VarChar to match PHP mssql_query behavior — NVarChar causes
    // implicit conversions on VARCHAR columns and kills index usage.
    // Use a reasonable default length instead of String(value).length
    // to avoid VarChar(1) on empty strings which forces implicit conversion.
    const len = String(value).length || 25;
    return mssql.VarChar(Math.max(len, 25));
  }

  /**
   * Ejecuta un Stored Procedure de manera asíncrona.
   * @param procedureName Nombre del SP
   * @param params Parámetros de entrada
   * @param types Mapa opcional de tipos SQL explícitos por nombre de parámetro.
   *              Ej: { criterio1: mssql.VarChar(50), inicio: mssql.Int }
   * @param timeout Timeout específico para esta ejecución (opcional).
   */
  async executeProcedure<T>(
    procedureName: string,
    params: Record<string, any> = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types?: Record<string, any>,
    timeout?: number,
  ): Promise<mssql.IProcedureResult<T>> {
    const request = this.pool.request();

    for (const [key, value] of Object.entries(params)) {
      const sqlType = types?.[key] ?? this.inferSqlType(value);
      request.input(key, sqlType, value);
    }

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(
        request.execute<T>(procedureName),
        request,
        timeout,
      );
    }

    return request.execute<T>(procedureName);
  }

  // /**
  //  * Ejecuta un SP con parámetros OUTPUT.
  //  * @param procedureName Nombre del SP
  //  * @param inputParams Parámetros de entrada
  //  * @param outputParams Definiciones de OUTPUT: { nombre: mssql.Type }
  //  * @param timeout Timeout opcional
  //  */
  // async executeProcedureWithOutput<T>(
  //   procedureName: string,
  //   inputParams: Record<string, any> = {},
  //   outputParams: Record<string, mssql.ISqlTypeFactoryWithNoParams> = {},
  //   timeout?: number,
  // ): Promise<mssql.IProcedureResult<T>> {
  //   const request = this.pool.request();

  //   for (const [key, value] of Object.entries(inputParams)) {
  //     request.input(key, value);
  //   }

  //   for (const [key, typeFactory] of Object.entries(outputParams)) {
  //     request.output(key, typeFactory);
  //   }

  //   if (timeout !== undefined && timeout !== null && timeout > 0) {
  //     return this.executeWithTimeout(
  //       request.execute<T>(procedureName),
  //       timeout,
  //     );
  //   }

  //   return request.execute<T>(procedureName);
  // }

  /**
   * Ejecuta un SP con parámetros OUTPUT.
   * @param procedureName Nombre del SP
   * @param inputParams Parámetros de entrada
   * @param outputParams Definiciones de OUTPUT: { nombre: mssql.Type }
   * @param timeout Timeout opcional
   */
  async executeProcedureWithOutput<T>(
    procedureName: string,
    inputParams: Record<string, any> = {},
    outputParams: Record<string, mssql.ISqlTypeFactoryWithNoParams> = {},
    timeout?: number,
  ): Promise<mssql.IProcedureResult<T>> {
    const request = this.pool.request();

    for (const [key, value] of Object.entries(inputParams)) {
      request.input(key, value);
    }

    for (const [key, typeFactory] of Object.entries(outputParams)) {
      request.output(key, typeFactory);
    }

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(
        request.execute<T>(procedureName),
        request,
        timeout,
      );
    }

    return request.execute<T>(procedureName);
  }

  /**
   * Ejecuta una consulta raw (query) si fuera necesaria.
   * @param queryStr Consulta SQL
   * @param params Parámetros para la consulta (opcional)
   * @param timeout Timeout específico para esta ejecución (opcional)
   */
  async query<T>(
    queryStr: string,
    params?: Record<string, any>,
    timeout?: number,
  ): Promise<mssql.IResult<T>> {
    const request = this.pool.request();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, this.inferSqlType(value), value);
      }
    }

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(request.query<T>(queryStr), request, timeout);
    }

    return request.query<T>(queryStr);
  }

  async queryWithParams<T>(
    queryStr: string,
    params: Record<string, any> = {},
    timeout?: number,
  ): Promise<mssql.IResult<T>> {
    const request = this.pool.request();

    for (const [key, value] of Object.entries(params)) {
      request.input(key, this.inferSqlType(value), value);
    }

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(
        request.query<T>(queryStr),
        request,
        timeout,
      );
    }

    return request.query<T>(queryStr);
  }

  /**
   * Ejecuta una promesa con un timeout manual usando race.
   * Si el timeout se alcanza antes de que la promesa se resuelva,
   * se lanza un error con código ETIMEOUT Y se cancela el request
   * (request.cancel()) para liberar el socket del pool. Sin esto,
   * el request queda abierto en SQL Server y los packets que llegan
   * después contaminan el pool → la siguiente llamada se cuelga.
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    request: mssql.Request,
    timeoutMs: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        const err = new Error(
          `La operación excedió el timeout de ${timeoutMs}ms.`,
        );
        (err as any).code = 'ETIMEOUT';
        reject(err);
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).catch(async (err) => {
      // Si disparamos el timeout, intentamos cancelar el request colgado
      // para que libere el socket del pool. El método `cancel` existe
      // en mssql.Request pero no está en los tipos públicos.
      if (err && (err as any).code === 'ETIMEOUT') {
        try {
          if (request && typeof request.cancel === 'function') {
            request.cancel();
          }
        } catch (cancelErr) {
          this.logger.warn(
            `No se pudo cancelar el request colgado: ${cancelErr}`,
          );
        }
      }
      throw err;
    }) as Promise<T>;
  }
}
