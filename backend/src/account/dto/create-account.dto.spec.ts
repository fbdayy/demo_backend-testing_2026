// ── CreateAccountDto Validation Tests ──────────────────────────────────────
// Ensures that CreateAccountDto correctly validates incoming request bodies.
// Uses class-validator's `validate` to check constraint annotations.
// All test cases are isolated and cover both valid and invalid inputs

import { validate } from 'class-validator';
import { CreateAccountDto } from './create-account.dto';
import { SupportedTickers } from '@prisma/client';

// ─── Helper Factories ─────────────────────────────────────────────────────
// Returns a plain object matching the DTO shape with valid defaults.
// Allows overriding specific fields to trigger validation errors
function makeValidDto(overrides: Partial<CreateAccountDto> = {}) {
  return Object.assign(
    {
      ownerId: '22222222-2222-4222-a222-222222222222',
      ticker: SupportedTickers.PET,
    },
    overrides,
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('CreateAccountDto', () => {
  it('should pass validation with correct ownerId and ticker', async () => {
    const dto = makeValidDto();
    const errors = await validate(Object.assign(new CreateAccountDto(), dto));

    expect(errors).toHaveLength(0);
  });

  // ── ownerId validations ─────────────────────────────────────────────────
  describe('ownerId', () => {
    it('fails if ownerId is missing', async () => {
      const dto = makeValidDto({ ownerId: undefined as any });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ownerId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('fails if ownerId is not a valid UUID', async () => {
      const dto = makeValidDto({ ownerId: 'not-a-uuid' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ownerId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('fails if ownerId is an empty string', async () => {
      const dto = makeValidDto({ ownerId: '' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ownerId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('passes with different valid UUID', async () => {
      const dto = makeValidDto({ ownerId: '11111111-1111-4111-a111-111111111111' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(0);
    });
  });

  // ── ticker validations ──────────────────────────────────────────────────
  describe('ticker', () => {
    it('fails if ticker is missing', async () => {
      const dto = makeValidDto({ ticker: undefined as any });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticker');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('fails if ticker is not a valid SupportedTickers value', async () => {
      const dto = makeValidDto({ ticker: 'INVALID' as any });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticker');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('passes with the other supported ticker', async () => {
      const dto = makeValidDto({ ticker: SupportedTickers.CAT });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(0);
    });

    it('fails if ticker is an empty string', async () => {
      const dto = makeValidDto({ ticker: '' as any });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ticker');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });
  });

  // ── initialBalance validations ──────────────────────────────────────────
  // initialBalance is optional, but when present must be a non-negative
  // integer string (it is later fed into BigInt() by AccountService)
  describe('initialBalance', () => {
    it('passes when initialBalance is omitted (optional field)', async () => {
      const dto = makeValidDto();
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(0);
    });

    it('passes with a valid non-negative integer string', async () => {
      const dto = makeValidDto({ initialBalance: '100000000' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(0);
    });

    it('passes with "0"', async () => {
      const dto = makeValidDto({ initialBalance: '0' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(0);
    });

    it('fails if initialBalance is a negative integer string', async () => {
      const dto = makeValidDto({ initialBalance: '-100' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('initialBalance');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('fails if initialBalance is not numeric', async () => {
      const dto = makeValidDto({ initialBalance: 'not-a-number' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('initialBalance');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('fails if initialBalance is a decimal string', async () => {
      const dto = makeValidDto({ initialBalance: '10.5' });
      const errors = await validate(Object.assign(new CreateAccountDto(), dto));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('initialBalance');
      expect(errors[0].constraints).toHaveProperty('matches');
    });
  });

  // ── Combined edge cases ─────────────────────────────────────────────────
  it('accumulates multiple errors if both fields are invalid', async () => {
    const dto = makeValidDto({ ownerId: 'bad-uuid', ticker: 'WRONG' as any });
    const errors = await validate(Object.assign(new CreateAccountDto(), dto));

    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['ownerId', 'ticker']),
    );
  });
});
