import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { getAddress, verifyMessage } from 'ethers';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RequestNonceDto } from './dto/request-nonce.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Implements a "Sign-In with Ethereum"-style authentication flow:
 *   1. requestNonce()   - client sends a public address, receives a message to sign
 *   2. login()          - client sends back the signature, receives access + refresh tokens
 *   3. refreshTokens()  - client rotates the token pair using a valid refresh token
 *   4. logout()         - server invalidates the stored refresh token
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Builds the message that the user signs with their wallet.
   * Must be generated identically at nonce-issuance time and at signature-verification time.
   */
  private buildSignMessage(publicAddress: string, nonce: string): string {
    return [
      'Sign this message to authenticate at Mini bank.',
      '',
      `Address: ${publicAddress}`,
      `Nonce: ${nonce}`,
    ].join('\n');
  }

  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Step 1: the client sends its address, we create the Owner if it doesn't
   * exist yet, and return a nonce wrapped in a message to sign.
   */
  async requestNonce(dto: RequestNonceDto) {
    // getAddress normalizes the address into checksum form (EIP-55).
    // Throws if the address is malformed.
    const publicAddress = getAddress(dto.publicAddress);
    const nonce = this.generateNonce();

    const owner = await this.prisma.owner.upsert({
      where: { publicAddress },
      update: { nonce },
      create: { publicAddress, nonce },
    });

    return {
      message: this.buildSignMessage(owner.publicAddress, nonce),
    };
  }

  /**
   * Step 2: the client sends its address and the signature of the message from step 1.
   * We verify that the signature was actually produced by the owner of that address,
   * then issue an access/refresh token pair.
   */
  async login(dto: VerifySignatureDto): Promise<Tokens> {
    const publicAddress = getAddress(dto.publicAddress);

    const owner = await this.prisma.owner.findUnique({
      where: { publicAddress },
    });

    if (!owner || !owner.nonce) {
      throw new BadRequestException(
        'Nonce not found. Call POST /auth/nonce first.',
      );
    }

    const message = this.buildSignMessage(publicAddress, owner.nonce);

    let recoveredAddress: string;

    try {
      recoveredAddress = verifyMessage(message, dto.signature);
    } catch {
      throw new UnauthorizedException('Invalid signature.');
    }

    if (getAddress(recoveredAddress) !== publicAddress) {
      throw new UnauthorizedException('Signature does not match the address.');
    }

    const tokens = await this.issueTokens(owner.id, owner.publicAddress);

    await this.prisma.owner.update({
      where: { id: owner.id },
      data: {
        // The one-time nonce must no longer be valid (protects against replay attacks)
        nonce: this.generateNonce(),
        hashedRefreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      },
    });

    return tokens;
  }

  /**
   * Rotates the token pair using a currently valid refresh token.
   */
  async refreshTokens(ownerId: string, refreshToken: string): Promise<Tokens> {
    const owner = await this.prisma.owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner || !owner.hashedRefreshToken) {
      throw new ForbiddenException('Access denied.');
    }

    const isMatch = await bcrypt.compare(refreshToken, owner.hashedRefreshToken);

    if (!isMatch) {
      throw new ForbiddenException('Access denied.');
    }

    const tokens = await this.issueTokens(owner.id, owner.publicAddress);

    await this.prisma.owner.update({
      where: { id: owner.id },
      data: { hashedRefreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return tokens;
  }

  /**
   * Logout: invalidates the refresh token on the server side.
   */
  async logout(ownerId: string) {
    await this.prisma.owner.update({
      where: { id: ownerId },
      data: { hashedRefreshToken: null },
    });
  }

  private async issueTokens(
    ownerId: string,
    publicAddress: string,
  ): Promise<Tokens> {
    const payload = { sub: ownerId, publicAddress };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    // Expressed in seconds
    const accessExpiresIn = Number(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')) || 900; // 15 minutes by default
    const refreshExpiresIn = Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) || 1296000; // 15 days by default

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
