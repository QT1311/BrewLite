import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // Đọc biến môi trường từ file .env ở thư mục gốc dự án (hoặc từ môi trường thật khi deploy)
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: Number(config.get('POSTGRES_PORT', 5432)),
        username: config.get('POSTGRES_USER', 'brewlite'),
        password: config.get('POSTGRES_PASSWORD', 'brewlite_dev_password'),
        database: config.get('POSTGRES_DB', 'brewlite'),
        autoLoadEntities: true,
        // Chỉ dùng ở giai đoạn phát triển. Khi lên production sẽ thay bằng migration (Task 5.2).
        synchronize: config.get('NODE_ENV') !== 'production',
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
