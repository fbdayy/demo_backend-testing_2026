import { IsUUID, IsDefined, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validates that a value is a positive bigint.
 *
 * Kept as a separate class-validator constraint (rather than throwing inside
 * @Transform) so that a malformed `amount` produces a normal 400 validation
 * error instead of an unhandled exception: errors thrown from a @Transform
 * callback happen during class-transformer's plainToInstance step, before
 * class-validator's ValidationPipe gets a chance to turn them into a proper
 * BadRequestException.
 */
@ValidatorConstraint({ name: 'isPositiveBigInt', async: false })
class IsPositiveBigIntConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'bigint' && value > 0n;
  }

  defaultMessage(): string {
    return 'amount must be a positive integer';
  }
}

export class CreateTransferDto {
  @ApiProperty({
    description: 'Account to debit.',
    format: 'uuid',
    example: '11111111-1111-4111-a111-111111111111',
  })
  @IsUUID()
  fromAccountId!: string;

  @ApiProperty({
    description: 'Account to credit.',
    format: 'uuid',
    example: '22222222-2222-4222-a222-222222222222',
  })
  @IsUUID()
  toAccountId!: string;

  /**
   * Amount to transfer, in elementary units. Accepted as a decimal integer
   * string on the wire (e.g. "100000000") and converted to bigint here.
   * Invalid or non-positive values are caught by IsPositiveBigIntConstraint,
   * not thrown from within the transform itself.
   */
  @ApiProperty({
    description:
      'Amount to transfer, in elementary units, as a positive decimal integer string.',
    type: String,
    example: '100000000',
  })
  @IsDefined()
  @Transform(({ value }: { value: string }) => {
    try {
      return BigInt(value);
    } catch {
      // Return the original value unchanged so IsPositiveBigIntConstraint
      // fails it with a clean validation error, instead of throwing here.
      return value;
    }
  })
  @Validate(IsPositiveBigIntConstraint)
  amount!: bigint;
}
