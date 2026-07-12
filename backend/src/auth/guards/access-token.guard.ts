import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards routes with a valid JWT access token (`Authorization: Bearer <accessToken>`).
 * Delegates verification to AccessTokenStrategy (passport strategy 'jwt-access').
 */
@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt-access') {}
