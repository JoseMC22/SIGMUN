import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
    },
    pool: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 30000,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000', 10),
  };

  async onModuleInit() {
    try {
      this.pool = await new mssql.ConnectionPool(this.config).connect();
      this.logger.log('Conexión a SQL Server establecida exitosamente (mssql pool).');
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
   * Ejecuta un Stored Procedure de manera asíncrona.
   * @param procedureName Nombre del SP
   * @param params Parámetros de entrada
   * @param timeout Timeout específico para esta ejecución (opcional). Si se especifica,
   *                se crea un timer que rechaza la promesa si se excede el tiempo.
   */
  async executeProcedure<T>(
    procedureName: string,
    params: Record<string, any> = {},
    timeout?: number,
  ): Promise<mssql.IProcedureResult<T>> {
    const request = this.pool.request();

    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(request.execute<T>(procedureName), timeout);
    }

    return request.execute<T>(procedureName);
  }

  /**
   * Ejecuta una consulta raw (query) si fuera necesaria.
   * @param queryStr Consulta SQL
   * @param timeout Timeout específico para esta ejecución (opcional)
   */
  async query<T>(
    queryStr: string,
    timeout?: number,
  ): Promise<mssql.IResult<T>> {
    const request = this.pool.request();

    if (timeout !== undefined && timeout !== null && timeout > 0) {
      return this.executeWithTimeout(request.query<T>(queryStr), timeout);
    }

    return request.query<T>(queryStr);
  }

  /**
   * Ejecuta una promesa con un timeout manual usando race.
   * Si el timeout se alcanza antes de que la promesa se resuelva,
   * se lanza un error con código ETIMEOUT.
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
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

    return Promise.race([promise, timeoutPromise]);
  }
}
