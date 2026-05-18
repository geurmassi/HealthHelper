import { SetMetadata } from '@nestjs/common';

// Decorator + metadata key flagging routes that don't require a JWT (read by JwtAuthGuard).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
