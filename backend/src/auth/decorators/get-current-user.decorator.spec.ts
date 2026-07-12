// ── GetCurrentUser Decorator Tests ─────────────────────────────────────────
// Param decorators can't be invoked directly outside of a request pipeline,
// so we test the underlying factory function that createParamDecorator wraps.
// This exercises exactly the logic that runs when @GetCurrentUser(...) fires.

import { ExecutionContext } from '@nestjs/common';

// Grab the factory function passed to createParamDecorator by mocking it
// so we can capture and invoke it directly.
let capturedFactory: (data: string | undefined, ctx: ExecutionContext) => unknown;

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    createParamDecorator: (factory: any) => {
      capturedFactory = factory;
      return factory;
    },
  };
});

// Import after the mock so the module picks up the mocked createParamDecorator
import { GetCurrentUser } from './get-current-user.decorator';

function makeContext(user: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('GetCurrentUser decorator', () => {
  it('is defined', () => {
    expect(GetCurrentUser).toBeDefined();
  });

  it('returns the whole user payload when no key is given', () => {
    const user = { sub: 'owner-id', publicAddress: '0xabc' };
    const result = capturedFactory(undefined, makeContext(user));

    expect(result).toEqual(user);
  });

  it('returns only the requested field when a key is given', () => {
    const user = { sub: 'owner-id', publicAddress: '0xabc' };
    const result = capturedFactory('sub', makeContext(user));

    expect(result).toBe('owner-id');
  });

  it('returns undefined if the requested field is not present on the user', () => {
    const user = { sub: 'owner-id' };
    const result = capturedFactory('refreshToken', makeContext(user));

    expect(result).toBeUndefined();
  });
});
