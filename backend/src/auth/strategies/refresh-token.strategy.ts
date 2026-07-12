import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './access-token.strategy';

/**
 * Passport strategy ('jwt-refresh') that validates the refresh token sent as
 * `Authorization: Bearer <refreshToken>` and exposes its payload (plus the raw
 * refresh token itself) as `req.user`.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: RefreshTokenStrategy.validateSecret(configService),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  /**
   * Ensures JWT_REFRESH_SECRET is present in the environment.
   */
  private static validateSecret(configService: ConfigService): string {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is missing in environment variables');
    }
    return secret;
  }

  // Also extract the raw refresh token from the header, so the service can
  // compare it against the hash stored in the database.
  validate(req: Request, payload: JwtPayload) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return { ...payload, refreshToken };
  }
}
