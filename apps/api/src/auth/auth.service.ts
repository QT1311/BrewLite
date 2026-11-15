import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.save(
      this.users.create({ email, name: dto.name.trim(), passwordHash, role: UserRole.CUSTOMER }),
    );
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào tồn tại.
    const ok = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user.isActive) throw new ForbiddenException('Tài khoản đã bị khoá');
    return this.issue(user);
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  private async issue(user: User): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.toPublic(user) };
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
