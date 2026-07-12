import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards routes with a valid JWT refresh token (`Authorization: Bearer <refreshToken>`).
 * Delegates verification to RefreshTokenStrategy (passport strategy 'jwt-refresh').
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
