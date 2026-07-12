import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // Owner.id
  publicAddress: string;
}

/**
 * Passport strategy ('jwt-access') that validates the access token sent as
 * `Authorization: Bearer <accessToken>` and exposes its payload as `req.user`.
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: AccessTokenStrategy.validateSecret(configService),
      ignoreExpiration: false,
    });
  }

  /**
   * Ensures JWT_ACCESS_SECRET is present in the environment.
   */
  private static validateSecret(configService: ConfigService): string {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is missing in environment variables');
    }
    return secret;
  }

  // This ends up on req.user
  validate(payload: JwtPayload) {
    return payload;
  }
}
