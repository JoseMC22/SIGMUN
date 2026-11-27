import { buildMssqlConfig } from './database.service';

describe('buildMssqlConfig', () => {
  const envBase: NodeJS.ProcessEnv = {
    DB_USER: 'dummy_user',
    DB_PASSWORD: 'dummy_password',
    DB_SERVER: 'dummy-server',
    DB_DATABASE: 'dummy_database',
    DB_PORT: '1450',
    DB_CONNECTION_TIMEOUT: '12345',
  };

  it('desactiva useUTC para no desplazar la hora local de SQL Server', () => {
    const config = buildMssqlConfig({ ...envBase, DB_ENCRYPT: 'true' });

    expect(config.options?.useUTC).toBe(false);
  });

  it('conserva las opciones y los campos existentes al mapear el entorno', () => {
    const config = buildMssqlConfig({ ...envBase, DB_ENCRYPT: 'true' });

    expect(config.options).toEqual(
      expect.objectContaining({
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        useUTC: false,
      }),
    );
    expect(config.server).toBe('dummy-server');
    expect(config.database).toBe('dummy_database');
    expect(config.port).toBe(1450);
    expect(config.user).toBe('dummy_user');
    expect(config.password).toBe('dummy_password');
    expect(config.pool).toEqual({ max: 20, min: 5, idleTimeoutMillis: 30000 });
    expect(config.requestTimeout).toBe(60000);
    expect(config.connectionTimeout).toBe(12345);
  });

  it('mantiene encrypt en false cuando DB_ENCRYPT no es "true"', () => {
    const config = buildMssqlConfig({ ...envBase, DB_ENCRYPT: 'false' });

    expect(config.options?.encrypt).toBe(false);
  });
});
