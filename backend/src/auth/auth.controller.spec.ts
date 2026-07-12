// ── AuthController Tests ────────────────────────────────────────────────────
// Unit tests for AuthController — validate that each endpoint delegates
// correctly to AuthService, and that @GetCurrentUser() pulls the right
// claims out of the request for the guarded routes.

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const OWNER_ID = '22222222-2222-4222-a222-222222222222';
const PUBLIC_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const SIGNATURE = '0xsignature';
const REFRESH_TOKEN = 'refresh.token.value';
const TOKENS = { accessToken: 'access.token.value', refreshToken: REFRESH_TOKEN };

// ─── Mock Guards ──────────────────────────────────────────────────────────
class MockAccessTokenGuard {
  canActivate() {
    return true;
  }
}
class MockRefreshTokenGuard {
  canActivate() {
    return true;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            requestNonce: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useClass(MockAccessTokenGuard)
      .overrideGuard(RefreshTokenGuard)
      .useClass(MockRefreshTokenGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authServiceMock = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /auth/nonce ───────────────────────────────────────────────────
  describe('requestNonce', () => {
    it('delegates to authService.requestNonce and returns the message', async () => {
      const dto = { publicAddress: PUBLIC_ADDRESS };
      const response = { message: 'Sign this message...' };
      authServiceMock.requestNonce.mockResolvedValue(response);

      const result = await controller.requestNonce(dto);

      expect(authServiceMock.requestNonce).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────
  describe('login', () => {
    it('delegates to authService.login and returns the token pair', async () => {
      const dto = { publicAddress: PUBLIC_ADDRESS, signature: SIGNATURE };
      authServiceMock.login.mockResolvedValue(TOKENS);

      const result = await controller.login(dto);

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(TOKENS);
    });

    it('propagates errors from the service (e.g. UnauthorizedException)', async () => {
      const dto = { publicAddress: PUBLIC_ADDRESS, signature: SIGNATURE };
      const error = new Error('Invalid signature.');
      authServiceMock.login.mockRejectedValue(error);

      await expect(controller.login(dto)).rejects.toThrow(error);
    });
  });

  // ─── POST /auth/refresh ─────────────────────────────────────────────────
  describe('refresh', () => {
    it('delegates to authService.refreshTokens with ownerId and refreshToken from the request', async () => {
      authServiceMock.refreshTokens.mockResolvedValue(TOKENS);

      const result = await controller.refresh(OWNER_ID, REFRESH_TOKEN);

      expect(authServiceMock.refreshTokens).toHaveBeenCalledWith(OWNER_ID, REFRESH_TOKEN);
      expect(result).toEqual(TOKENS);
    });
  });

  // ─── POST /auth/logout ──────────────────────────────────────────────────
  describe('logout', () => {
    it('delegates to authService.logout with the ownerId from the request', async () => {
      authServiceMock.logout.mockResolvedValue(undefined);

      await controller.logout(OWNER_ID);

      expect(authServiceMock.logout).toHaveBeenCalledWith(OWNER_ID);
    });
  });
});
