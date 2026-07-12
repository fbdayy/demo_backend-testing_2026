import { IsEthereumAddress } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for `POST /owners`.
 */
export class CreateOwnerDto {
  /**
   * Ethereum-compatible wallet public address (0x...).
   * class-validator checks the format via @IsEthereumAddress().
   */
  @ApiProperty({
    description: 'Ethereum-compatible wallet public address.',
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  @IsEthereumAddress()
  publicAddress!: string;
}
