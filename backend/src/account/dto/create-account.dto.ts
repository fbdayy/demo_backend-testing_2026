import { IsEnum, IsUUID, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedTickers } from '@prisma/client';

/**
 * Payload for `POST /accounts`.
 */
export class CreateAccountDto {
  /** ID of the account owner. */
  @ApiProperty({
    description: 'ID of the account owner.',
    format: 'uuid',
    example: '22222222-2222-4222-a222-222222222222',
  })
  @IsUUID()
  ownerId!: string;

  /** Currency ticker (PET or CAT). */
  @ApiProperty({
    description: 'Currency ticker.',
    enum: SupportedTickers,
    example: SupportedTickers.PET,
  })
  @IsEnum(SupportedTickers)
  ticker!: SupportedTickers;

  /**
   * Optional starting balance, in elementary units, as a decimal integer string
   * (e.g. "100000000"). Defaults to "0" inside AccountService.create() when omitted.
   * Must be a non-negative integer — negative starting balances are not allowed.
   */
  @ApiPropertyOptional({
    description:
      'Starting balance, in elementary units, as a non-negative decimal integer string. Defaults to "0" when omitted.',
    example: '100000000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'initialBalance must be a non-negative integer string' })
  initialBalance?: string;
}
