import { DataSourceOptions } from 'typeorm';
import { migrations } from './migrations';

type Env = Record<string, string | undefined>;

/**
 * Cấu hình kết nối PostgreSQL dùng chung cho ứng dụng NestJS và TypeORM CLI (migration).
 *
 * - Production (Railway...): đặt DATABASE_URL (và DB_SSL=true nếu nhà cung cấp yêu cầu).
 * - Local/CI: dùng nhóm biến POSTGRES_*.
 * - Schema chỉ thay đổi qua migration. `synchronize` mặc định TẮT; chỉ bật khi đặt DB_SYNCHRONIZE=true (thử nghiệm cục bộ).
 * - Migration tự chạy khi API khởi động (DB_MIGRATIONS_RUN=false để tắt).
 */
export function buildDataSourceOptions(env: Env): DataSourceOptions {
  const connection = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.POSTGRES_HOST ?? 'localhost',
        port: Number(env.POSTGRES_PORT ?? 5432),
        username: env.POSTGRES_USER ?? 'brewlite',
        password: env.POSTGRES_PASSWORD ?? 'brewlite_dev_password',
        database: env.POSTGRES_DB ?? 'brewlite',
      };

  return {
    type: 'postgres',
    ...connection,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    migrations,
    migrationsTableName: 'migrations',
    migrationsRun: env.DB_MIGRATIONS_RUN !== 'false',
    synchronize: env.DB_SYNCHRONIZE === 'true',
  };
}
