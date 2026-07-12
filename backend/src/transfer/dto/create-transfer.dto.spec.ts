// ── CreateTransferDto Validation Tests ─────────────────────────────────────
// Ensures fromAccountId/toAccountId are UUIDs and that `amount` is safely
// coerced to a positive bigint. In particular: malformed or non-positive
// amounts must produce a normal validation error (via IsPositiveBigIntConstraint)
// rather than throw an uncaught exception out of the @Transform step.

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransferDto } from './create-transfer.dto';

const ACCOUNT_A = '11111111-1111-4111-a111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-a222-222222222222';

function makeValidPlainBody(overrides: Record<string, any> = {}) {
  return {
    fromAccountId: ACCOUNT_A,
    toAccountId: ACCOUNT_B,
    amount: '500',
    ...overrides,
  };
}

// Mirrors what Nest's ValidationPipe does: plainToInstance() first (running
// @Transform), then validate() on the resulting instance.
async function validateBody(plain: Record<string, any>) {
  const instance = plainToInstance(CreateTransferDto, plain);
  return validate(instance);
}

describe('CreateTransferDto', () => {
  it('passes validation and coerces amount to a positive bigint', async () => {
    const instance = plainToInstance(CreateTransferDto, makeValidPlainBody());
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
    expect(instance.amount).toBe(500n);
    expect(typeof instance.amount).toBe('bigint');
  });

  describe('fromAccountId / toAccountId', () => {
    it('fails if fromAccountId is not a UUID', async () => {
      const errors = await validateBody(makeValidPlainBody({ fromAccountId: 'not-a-uuid' }));

      expect(errors.some((e) => e.property === 'fromAccountId')).toBe(true);
    });

    it('fails if toAccountId is not a UUID', async () => {
      const errors = await validateBody(makeValidPlainBody({ toAccountId: 'not-a-uuid' }));

      expect(errors.some((e) => e.property === 'toAccountId')).toBe(true);
    });
  });

  describe('amount', () => {
    it('does not throw, and fails validation cleanly, for a non-numeric amount', async () => {
      // This is the regression case: previously, a bad `amount` threw a raw
      // Error from inside @Transform, which never made it into `errors`.
      await expect(validateBody(makeValidPlainBody({ amount: 'not-a-number' }))).resolves.not.toThrow();

      const errors = await validateBody(makeValidPlainBody({ amount: 'not-a-number' }));
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
      expect(errors.find((e) => e.property === 'amount')?.constraints).toHaveProperty(
        'isPositiveBigInt',
      );
    });

    it('fails validation cleanly for a zero amount', async () => {
      const errors = await validateBody(makeValidPlainBody({ amount: '0' }));

      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('fails validation cleanly for a negative amount', async () => {
      const errors = await validateBody(makeValidPlainBody({ amount: '-100' }));

      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('fails if amount is missing', async () => {
      const errors = await validateBody(makeValidPlainBody({ amount: undefined }));

      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });
  });
});
