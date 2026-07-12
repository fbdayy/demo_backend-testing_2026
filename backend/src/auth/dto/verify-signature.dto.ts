import { IsEthereumAddress, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for `POST /auth/login` — step 2 of the login flow.
 */
export class VerifySignatureDto {
  /** Ethereum-compatible wallet public address (0x...), same as used in step 1. */
  @ApiProperty({
    description: 'Ethereum-compatible wallet public address, same as used in step 1.',
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  @IsEthereumAddress()
  publicAddress!: string;

  /** Signature of the nonce message, produced by the wallet's private key. */
  @ApiProperty({
    description: "Signature of the nonce message, produced by the wallet's private key.",
    example: '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8...1b',
  })
  @IsString()
  @MinLength(1)
  signature!: string;
}
