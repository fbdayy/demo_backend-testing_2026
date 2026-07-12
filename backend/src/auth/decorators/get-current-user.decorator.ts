import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Usage:
 *   @GetCurrentUser() user             -> the whole JWT payload
 *   @GetCurrentUser('sub') ownerId     -> just Owner.id
 *   @GetCurrentUser('refreshToken') rt -> the raw refresh token (refresh strategy only)
 */
export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    if (!data) return request.user;
    return request.user?.[data];
  },
);
