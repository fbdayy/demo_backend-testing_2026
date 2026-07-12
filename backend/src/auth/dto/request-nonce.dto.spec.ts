// ── RequestNonceDto Validation Tests ───────────────────────────────────────
// Ensures that RequestNonceDto only accepts a valid Ethereum address.

import { validate } from 'class-validator';
import { RequestNonceDto } from './request-nonce.dto';

const VALID_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('RequestNonceDto', () => {
  it('passes validation with a valid Ethereum address', async () => {
    const dto = Object.assign(new RequestNonceDto(), { publicAddress: VALID_ADDRESS });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails if publicAddress is missing', async () => {
    const dto = Object.assign(new RequestNonceDto(), {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
    expect(errors[0].constraints).toHaveProperty('isEthereumAddress');
  });

  it('fails if publicAddress is not a valid Ethereum address', async () => {
    const dto = Object.assign(new RequestNonceDto(), { publicAddress: 'not-an-address' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
    expect(errors[0].constraints).toHaveProperty('isEthereumAddress');
  });

  it('fails if publicAddress is missing the 0x prefix', async () => {
    const dto = Object.assign(new RequestNonceDto(), {
      publicAddress: VALID_ADDRESS.slice(2),
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
  });
});
