// ── AccessTokenGuard Tests ──────────────────────────────────────────────────
// AccessTokenGuard has no custom logic of its own — it only binds the
// 'jwt-access' passport strategy to AuthGuard(). These tests just confirm
// that wiring is in place; actual token verification is exercised via
// AccessTokenStrategy's own tests and the e2e suite.

import { AuthGuard } from '@nestjs/passport';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  it('is defined', () => {
    expect(new AccessTokenGuard()).toBeDefined();
  });

  it('extends the passport AuthGuard for the "jwt-access" strategy', () => {
    const guard = new AccessTokenGuard();

    expect(guard).toBeInstanceOf(AuthGuard('jwt-access'));
  });
});
