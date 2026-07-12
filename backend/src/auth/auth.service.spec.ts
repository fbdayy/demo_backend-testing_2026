// ── AuthService Tests ───────────────────────────────────────────────────────
// Unit tests for AuthService — covers the nonce/login/refresh/logout flow.
// `ethers` and `bcrypt` are mocked so tests never touch real cryptography;
// only the service's own branching logic is under test here.
// See auth.e2e-spec.ts for a full end-to-end run with real signatures.

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { getAddress, verifyMessage } from 'ethers';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');
jest.mock('ethers');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedGetAddress = getAddress as jest.MockedFunction<typeof getAddress>;
const mockedVerifyMessage = verifyMessage as jest.MockedFunction<typeof verifyMessage>;

// ─── Test Identifiers ─────────────────────────────────────────────────────
const OWNER_ID = '22222222-2222-4222-a222-222222222222';
const PUBLIC_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const NONCE = 'deadbeefdeadbeef';
const SIGNATURE = '0xsignature';
const ACCESS_TOKEN = 'access.token.value';
const REFRESH_TOKEN = 'refresh.token.value';
const HASHED_REFRESH_TOKEN = 'hashed-refresh-token';

// ─── Test Entity Factories ────────────────────────────────────────────────
function createTestOwner(overrides: Record<string, any> = {}) {
  return {
    id: OWNER_ID,
    publicAddress: PUBLIC_ADDRESS,
    nonce: NONCE,
    hashedRefreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;
  let configServiceMock: any;

  beforeEach(async () => {
    // getAddress normally checksums an address; for these tests just echo it back
    mockedGetAddress.mockImplementation((addr: string) => addr as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            owner: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prismaMock = module.get(PrismaService);
    jwtServiceMock = module.get(JwtService);
    configServiceMock = module.get(ConfigService);

    jwtServiceMock.signAsync
      .mockResolvedValueOnce(ACCESS_TOKEN)
      .mockResolvedValueOnce(REFRESH_TOKEN);
    mockedBcrypt.hash.mockResolvedValue(HASHED_REFRESH_TOKEN as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── requestNonce ─────────────────────────────────────────────────────────
  describe('requestNonce', () => {
    it('upserts the owner by publicAddress and returns a signable message containing the nonce', async () => {
      const owner = createTestOwner();
      prismaMock.owner.upsert.mockResolvedValue(owner);

      const result = await service.requestNonce({ publicAddress: PUBLIC_ADDRESS });

      expect(prismaMock.owner.upsert).toHaveBeenCalledWith({
        where: { publicAddress: PUBLIC_ADDRESS },
        update: { nonce: expect.any(String) },
        create: { publicAddress: PUBLIC_ADDRESS, nonce: expect.any(String) },
      });
      expect(result.message).toContain(`Address: ${PUBLIC_ADDRESS}`);
      expect(result.message).toContain('Nonce:');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    const loginDto = { publicAddress: PUBLIC_ADDRESS, signature: SIGNATURE };

    it('throws BadRequestException if the owner does not exist', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if the owner has no pending nonce', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(createTestOwner({ nonce: null }));

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException if signature verification throws', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(createTestOwner());
      mockedVerifyMessage.mockImplementation(() => {
        throw new Error('malformed signature');
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if the recovered address does not match', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(createTestOwner());
      mockedVerifyMessage.mockReturnValue('0xSomeoneElseAddress' as any);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('issues tokens and rotates the nonce + hashedRefreshToken on success', async () => {
      const owner = createTestOwner();
      prismaMock.owner.findUnique.mockResolvedValue(owner);
      mockedVerifyMessage.mockReturnValue(PUBLIC_ADDRESS as any);
      prismaMock.owner.update.mockResolvedValue(owner);

      const result = await service.login(loginDto);

      expect(result).toEqual({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
      expect(prismaMock.owner.update).toHaveBeenCalledWith({
        where: { id: OWNER_ID },
        data: {
          nonce: expect.any(String),
          hashedRefreshToken: HASHED_REFRESH_TOKEN,
        },
      });
      // The replacement nonce must differ from the one that was just consumed
      const updateCall = prismaMock.owner.update.mock.calls[0][0];
      expect(updateCall.data.nonce).not.toBe(NONCE);
    });
  });

  // ─── refreshTokens ───────────────────────────────────────────────────────
  describe('refreshTokens', () => {
    it('throws ForbiddenException if the owner does not exist', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(OWNER_ID, REFRESH_TOKEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if the owner has no stored refresh token', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(
        createTestOwner({ hashedRefreshToken: null }),
      );

      await expect(service.refreshTokens(OWNER_ID, REFRESH_TOKEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if the refresh token does not match the stored hash', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(
        createTestOwner({ hashedRefreshToken: 'some-other-hash' }),
      );
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.refreshTokens(OWNER_ID, REFRESH_TOKEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('issues a new token pair and re-hashes the refresh token on success', async () => {
      const owner = createTestOwner({ hashedRefreshToken: 'old-hash' });
      prismaMock.owner.findUnique.mockResolvedValue(owner);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      prismaMock.owner.update.mockResolvedValue(owner);

      const result = await service.refreshTokens(OWNER_ID, REFRESH_TOKEN);

      expect(result).toEqual({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
      expect(prismaMock.owner.update).toHaveBeenCalledWith({
        where: { id: OWNER_ID },
        data: { hashedRefreshToken: HASHED_REFRESH_TOKEN },
      });
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('clears the stored hashedRefreshToken', async () => {
      prismaMock.owner.update.mockResolvedValue(createTestOwner({ hashedRefreshToken: null }));

      await service.logout(OWNER_ID);

      expect(prismaMock.owner.update).toHaveBeenCalledWith({
        where: { id: OWNER_ID },
        data: { hashedRefreshToken: null },
      });
    });
  });
});
