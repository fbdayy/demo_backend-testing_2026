// ── OwnerService Tests ──────────────────────────────────────────────────────
// Tests for OwnerService — covers lookup by id, lookup by wallet address,
// and creation.

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const OWNER_ID = '22222222-2222-4222-a222-222222222222';
const PUBLIC_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// ─── Test Entity Factories ────────────────────────────────────────────────
function createTestOwner(overrides: Record<string, any> = {}) {
  return {
    id: OWNER_ID,
    publicAddress: PUBLIC_ADDRESS,
    nonce: 'deadbeef',
    hashedRefreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('OwnerService', () => {
  let service: OwnerService;
  let prismaMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerService,
        {
          provide: PrismaService,
          useValue: {
            owner: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(OwnerService);
    prismaMock = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Find by id ──────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the owner if it exists', async () => {
      const owner = createTestOwner();
      prismaMock.owner.findUnique.mockResolvedValue(owner);

      const result = await service.findById(OWNER_ID);

      expect(prismaMock.owner.findUnique).toHaveBeenCalledWith({ where: { id: OWNER_ID } });
      expect(result).toEqual(owner);
    });

    it('throws NotFoundException if the owner does not exist', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(null);

      await expect(service.findById(OWNER_ID)).rejects.toThrow(
        new NotFoundException(`Owner ${OWNER_ID} not found`),
      );
    });
  });

  // ─── Find by publicAddress ──────────────────────────────────────────────
  describe('findByPublicAddress', () => {
    it('returns the owner if the address is registered', async () => {
      const owner = createTestOwner();
      prismaMock.owner.findUnique.mockResolvedValue(owner);

      const result = await service.findByPublicAddress(PUBLIC_ADDRESS);

      expect(prismaMock.owner.findUnique).toHaveBeenCalledWith({
        where: { publicAddress: PUBLIC_ADDRESS },
      });
      expect(result).toEqual(owner);
    });

    it('returns null (does not throw) if the address is not registered', async () => {
      prismaMock.owner.findUnique.mockResolvedValue(null);

      const result = await service.findByPublicAddress(PUBLIC_ADDRESS);

      expect(result).toBeNull();
    });
  });

  // ─── Create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a new owner with the given publicAddress', async () => {
      const owner = createTestOwner();
      prismaMock.owner.create.mockResolvedValue(owner);

      const result = await service.create(PUBLIC_ADDRESS);

      expect(prismaMock.owner.create).toHaveBeenCalledWith({
        data: { publicAddress: PUBLIC_ADDRESS },
      });
      expect(result).toEqual(owner);
    });

    it('propagates database errors (e.g. unique constraint violations)', async () => {
      const error = new Error('Unique constraint failed');
      prismaMock.owner.create.mockRejectedValue(error);

      await expect(service.create(PUBLIC_ADDRESS)).rejects.toThrow(error);
    });
  });
});
