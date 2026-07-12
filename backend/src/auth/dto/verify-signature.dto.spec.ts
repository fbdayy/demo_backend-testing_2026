// ── VerifySignatureDto Validation Tests ────────────────────────────────────
// Ensures that VerifySignatureDto requires both a valid Ethereum address
// and a non-empty signature string.

import { validate } from 'class-validator';
import { VerifySignatureDto } from './verify-signature.dto';

const VALID_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const VALID_SIGNATURE = '0xdeadbeef';

function makeValidDto(overrides: Partial<VerifySignatureDto> = {}) {
  return Object.assign(new VerifySignatureDto(), {
    publicAddress: VALID_ADDRESS,
    signature: VALID_SIGNATURE,
  }, overrides);
}

describe('VerifySignatureDto', () => {
  it('passes validation with a valid address and signature', async () => {
    const errors = await validate(makeValidDto());

    expect(errors).toHaveLength(0);
  });

  describe('publicAddress', () => {
    it('fails if publicAddress is not a valid Ethereum address', async () => {
      const errors = await validate(makeValidDto({ publicAddress: 'bad-address' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('publicAddress');
      expect(errors[0].constraints).toHaveProperty('isEthereumAddress');
    });
  });

  describe('signature', () => {
    it('fails if signature is missing', async () => {
      const errors = await validate(makeValidDto({ signature: undefined as any }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('signature');
    });

    it('fails if signature is an empty string', async () => {
      const errors = await validate(makeValidDto({ signature: '' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('signature');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('fails if signature is not a string', async () => {
      const errors = await validate(makeValidDto({ signature: 12345 as any }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('signature');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  it('accumulates multiple errors if both fields are invalid', async () => {
    const errors = await validate(
      makeValidDto({ publicAddress: 'bad-address', signature: '' }),
    );

    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['publicAddress', 'signature']),
    );
  });
});
