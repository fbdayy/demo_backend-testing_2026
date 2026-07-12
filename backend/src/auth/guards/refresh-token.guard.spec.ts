// ── RefreshTokenGuard Tests ─────────────────────────────────────────────────
// RefreshTokenGuard has no custom logic of its own — it only binds the
// 'jwt-refresh' passport strategy to AuthGuard(). These tests just confirm
// that wiring is in place; actual token verification is exercised via
// RefreshTokenStrategy's own tests and the e2e suite.

import { AuthGuard } from '@nestjs/passport';
import { RefreshTokenGuard } from './refresh-token.guard';

describe('RefreshTokenGuard', () => {
  it('is defined', () => {
    expect(new RefreshTokenGuard()).toBeDefined();
  });

  it('extends the passport AuthGuard for the "jwt-refresh" strategy', () => {
    const guard = new RefreshTokenGuard();

    expect(guard).toBeInstanceOf(AuthGuard('jwt-refresh'));
  });
});
