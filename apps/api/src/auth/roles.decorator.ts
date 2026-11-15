import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user-role';

export const ROLES_KEY = 'roles';
/** Giới hạn route theo vai trò. Dùng cùng `JwtAuthGuard` và `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
