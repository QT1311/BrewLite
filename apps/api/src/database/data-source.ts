/**
 * DataSource dành cho TypeORM CLI (npm run migration:*).
 * Không dùng bởi ứng dụng khi chạy; ứng dụng dùng buildDataSourceOptions trong AppModule.
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

config({ path: join(__dirname, '../../../../.env') });

export default new DataSource({
  ...buildDataSourceOptions(process.env),
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrationsRun: false,
});
