import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret && config.get('NODE_ENV') === 'production') {
          throw new Error('Thiếu JWT_SECRET khi chạy production');
        }
        return {
          secret: secret ?? 'dev-only-secret-change-me',
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1d') },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, AdminBootstrapService],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
