import { IsEthereumAddress } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for `POST /auth/nonce` — step 1 of the login flow.
 */
export class RequestNonceDto {
  /** Ethereum-compatible wallet public address (0x...). */
  @ApiProperty({
    description: 'Ethereum-compatible wallet public address.',
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  @IsEthereumAddress()
  publicAddress!: string;
}
