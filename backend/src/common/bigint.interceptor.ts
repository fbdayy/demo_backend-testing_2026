import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Globally replaces every BigInt value in the response body with a string,
 * since JSON.stringify() does not support BigInt natively.
 */
@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) =>
        JSON.parse(
          JSON.stringify(data, (_key, val) =>
            typeof val === 'bigint' ? val.toString() : val,
          ),
        ),
      ),
    );
  }
}
