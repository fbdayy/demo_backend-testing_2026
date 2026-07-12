// ── BigIntInterceptor Tests ─────────────────────────────────────────────────
// Ensures BigInt values anywhere in a response payload (top-level, nested,
// inside arrays) are serialized to strings, and that everything else passes
// through unchanged.

import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { BigIntInterceptor } from './bigint.interceptor';

function runInterceptor(data: unknown): Promise<unknown> {
  const interceptor = new BigIntInterceptor();
  const context = {} as ExecutionContext;
  const handler: CallHandler = { handle: () => of(data) };

  return new Promise((resolve) => {
    interceptor.intercept(context, handler).subscribe((result) => resolve(result));
  });
}

describe('BigIntInterceptor', () => {
  it('converts a top-level bigint field to a string', async () => {
    const result = await runInterceptor({ balance: 1000n });

    expect(result).toEqual({ balance: '1000' });
  });

  it('converts nested bigint fields to strings', async () => {
    const result = await runInterceptor({
      account: { id: 'abc', balance: { balance: 250n } },
    });

    expect(result).toEqual({
      account: { id: 'abc', balance: { balance: '250' } },
    });
  });

  it('converts bigint values inside arrays', async () => {
    const result = await runInterceptor([{ balance: 1n }, { balance: 2n }]);

    expect(result).toEqual([{ balance: '1' }, { balance: '2' }]);
  });

  it('leaves non-bigint values untouched', async () => {
    const payload = { id: 'abc', count: 5, name: 'PET', active: true, tag: null };

    const result = await runInterceptor(payload);

    expect(result).toEqual(payload);
  });

  it('passes through primitives and null/undefined-shaped responses', async () => {
    expect(await runInterceptor(null)).toBeNull();
    expect(await runInterceptor('ok')).toBe('ok');
  });
});
