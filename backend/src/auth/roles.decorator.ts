import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

// Decorator + metadata key listing UserRoles allowed to invoke a route (read by RolesGuard).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
