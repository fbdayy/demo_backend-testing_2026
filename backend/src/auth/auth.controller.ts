import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestNonceDto } from './dto/request-nonce.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GetCurrentUser } from './decorators/get-current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/nonce
   * Step 1 of the login flow: returns a message the client must sign with its wallet.
   */
  @ApiOperation({
    summary: 'Request a nonce to sign',
    description:
      'Step 1 of the login flow. Creates the owner if the address is new, ' +
      'and returns a message to sign with the wallet.',
  })
  @ApiResponse({ status: 200, description: 'Message to sign, returned.' })
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  requestNonce(@Body() dto: RequestNonceDto) {
    return this.authService.requestNonce(dto);
  }

  /**
   * POST /auth/login
   * Step 2 of the login flow: verifies the signature and returns an access + refresh token pair.
   */
  @ApiOperation({
    summary: 'Verify the signature and log in',
    description: 'Step 2 of the login flow. Returns a fresh access + refresh token pair.',
  })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens issued.' })
  @ApiResponse({ status: 400, description: 'No pending nonce for this address.' })
  @ApiResponse({ status: 401, description: 'Invalid signature.' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: VerifySignatureDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/refresh
   * Rotates the token pair using a valid refresh token
   * (sent as `Authorization: Bearer <refreshToken>`).
   */
  @ApiOperation({
    summary: 'Rotate the token pair',
    description: 'Send the refresh token as `Authorization: Bearer <refreshToken>`.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'New access and refresh tokens issued.' })
  @ApiResponse({ status: 403, description: 'Refresh token missing, invalid, or revoked.' })
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @GetCurrentUser('sub') ownerId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(ownerId, refreshToken);
  }

  /**
   * POST /auth/logout
   * Invalidates the stored refresh token using a valid access token
   * (sent as `Authorization: Bearer <accessToken>`).
   */
  @ApiOperation({ summary: 'Log out (invalidate the stored refresh token)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Logged out.' })
  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUser('sub') ownerId: string) {
    return this.authService.logout(ownerId);
  }
}
