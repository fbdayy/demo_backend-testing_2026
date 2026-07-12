// ── CreateOwnerDto Validation Tests ────────────────────────────────────────
// Ensures that CreateOwnerDto only accepts a valid Ethereum address.

import { validate } from 'class-validator';
import { CreateOwnerDto } from './create-owner.dto';

const VALID_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('CreateOwnerDto', () => {
  it('passes validation with a valid Ethereum address', async () => {
    const dto = Object.assign(new CreateOwnerDto(), { publicAddress: VALID_ADDRESS });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails if publicAddress is missing', async () => {
    const dto = Object.assign(new CreateOwnerDto(), {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
    expect(errors[0].constraints).toHaveProperty('isEthereumAddress');
  });

  it('fails if publicAddress is not a valid Ethereum address', async () => {
    const dto = Object.assign(new CreateOwnerDto(), { publicAddress: 'not-an-address' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
    expect(errors[0].constraints).toHaveProperty('isEthereumAddress');
  });

  it('fails if publicAddress is too short', async () => {
    const dto = Object.assign(new CreateOwnerDto(), { publicAddress: '0x1234' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('publicAddress');
  });
});
