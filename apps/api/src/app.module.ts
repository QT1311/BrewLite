import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { buildDataSourceOptions } from './database/database.config';

@Module({
  imports: [
    // Đọc biến môi trường từ file .env ở thư mục gốc dự án (hoặc từ môi trường thật khi deploy)
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDataSourceOptions({
          DATABASE_URL: config.get('DATABASE_URL'),
          DB_SSL: config.get('DB_SSL'),
          DB_MIGRATIONS_RUN: config.get('DB_MIGRATIONS_RUN'),
          DB_SYNCHRONIZE: config.get('DB_SYNCHRONIZE'),
          POSTGRES_HOST: config.get('POSTGRES_HOST'),
          POSTGRES_PORT: config.get('POSTGRES_PORT'),
          POSTGRES_USER: config.get('POSTGRES_USER'),
          POSTGRES_PASSWORD: config.get('POSTGRES_PASSWORD'),
          POSTGRES_DB: config.get('POSTGRES_DB'),
        }),
        autoLoadEntities: true,
      }),
    }),
    ProductsModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
