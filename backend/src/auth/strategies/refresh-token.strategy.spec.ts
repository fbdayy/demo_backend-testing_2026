// ── RefreshTokenStrategy Tests ──────────────────────────────────────────────
// Covers secret validation at construction time and that validate() attaches
// the raw refresh token (extracted from the Authorization header) to the payload.

import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { JwtPayload } from './access-token.strategy';

function makeConfigService(secret: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

function makeRequest(bearerToken: string): Request {
  return {
    headers: { authorization: `Bearer ${bearerToken}` },
  } as unknown as Request;
}

describe('RefreshTokenStrategy', () => {
  it('constructs successfully when JWT_REFRESH_SECRET is configured', () => {
    const strategy = new RefreshTokenStrategy(makeConfigService('a-secret'));

    expect(strategy).toBeDefined();
  });

  it('throws if JWT_REFRESH_SECRET is missing', () => {
    expect(() => new RefreshTokenStrategy(makeConfigService(undefined))).toThrow(
      'JWT_REFRESH_SECRET is missing in environment variables',
    );
  });

  it('validate() merges the payload with the raw refresh token from the Authorization header', () => {
    const strategy = new RefreshTokenStrategy(makeConfigService('a-secret'));
    const payload: JwtPayload = {
      sub: '22222222-2222-4222-a222-222222222222',
      publicAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    };
    const req = makeRequest('raw-refresh-token-value');

    const result = strategy.validate(req, payload);

    expect(result).toEqual({ ...payload, refreshToken: 'raw-refresh-token-value' });
  });
});
