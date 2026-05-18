import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from '../users/user.entity';

// Param decorator that reads the authenticated user off the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as User;
  },
);
