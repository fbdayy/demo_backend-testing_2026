// ── AccessTokenStrategy Tests ───────────────────────────────────────────────
// Covers secret validation at construction time and payload pass-through
// in validate() (whatever validate() returns becomes req.user).

import { ConfigService } from '@nestjs/config';
import { AccessTokenStrategy, JwtPayload } from './access-token.strategy';

function makeConfigService(secret: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

describe('AccessTokenStrategy', () => {
  it('constructs successfully when JWT_ACCESS_SECRET is configured', () => {
    const strategy = new AccessTokenStrategy(makeConfigService('a-secret'));

    expect(strategy).toBeDefined();
  });

  it('throws if JWT_ACCESS_SECRET is missing', () => {
    expect(() => new AccessTokenStrategy(makeConfigService(undefined))).toThrow(
      'JWT_ACCESS_SECRET is missing in environment variables',
    );
  });

  it('validate() returns the JWT payload unchanged, to be attached as req.user', () => {
    const strategy = new AccessTokenStrategy(makeConfigService('a-secret'));
    const payload: JwtPayload = {
      sub: '22222222-2222-4222-a222-222222222222',
      publicAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    };

    expect(strategy.validate(payload)).toBe(payload);
  });
});
