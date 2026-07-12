// ── OwnerController Tests ───────────────────────────────────────────────────
// Unit tests for OwnerController — validate that each endpoint delegates
// correctly to OwnerService and translates its results into the right
// HTTP semantics (409 on duplicate address, 404 on missing address).
// The AccessTokenGuard is overridden with a mock that always passes.

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const OWNER_ID = '22222222-2222-4222-a222-222222222222';
const PUBLIC_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// ─── Mock Guard ───────────────────────────────────────────────────────────
class MockAccessTokenGuard {
  canActivate() {
    return true;
  }
}

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
describe('OwnerController', () => {
  let controller: OwnerController;
  let ownerServiceMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnerController],
      providers: [
        {
          provide: OwnerService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByPublicAddress: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useClass(MockAccessTokenGuard)
      .compile();

    controller = module.get<OwnerController>(OwnerController);
    ownerServiceMock = module.get(OwnerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /owners ───────────────────────────────────────────────────────
  describe('create', () => {
    it('creates the owner when the address is not already registered', async () => {
      const dto = { publicAddress: PUBLIC_ADDRESS };
      const fakeOwner = createTestOwner();
      ownerServiceMock.findByPublicAddress.mockResolvedValue(null);
      ownerServiceMock.create.mockResolvedValue(fakeOwner);

      const result = await controller.create(dto);

      expect(ownerServiceMock.findByPublicAddress).toHaveBeenCalledWith(PUBLIC_ADDRESS);
      expect(ownerServiceMock.create).toHaveBeenCalledWith(PUBLIC_ADDRESS);
      expect(result).toEqual(fakeOwner);
    });

    it('throws ConflictException (409) if the address is already registered', async () => {
      const dto = { publicAddress: PUBLIC_ADDRESS };
      ownerServiceMock.findByPublicAddress.mockResolvedValue(createTestOwner());

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
      expect(ownerServiceMock.create).not.toHaveBeenCalled();
    });
  });

  // ─── GET /owners/:id ────────────────────────────────────────────────────
  describe('findOne', () => {
    it('delegates to ownerService.findById and returns the owner', async () => {
      const fakeOwner = createTestOwner();
      ownerServiceMock.findById.mockResolvedValue(fakeOwner);

      const result = await controller.findOne(OWNER_ID);

      expect(ownerServiceMock.findById).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(fakeOwner);
    });

    it('propagates errors from the service (e.g. NotFoundException)', async () => {
      const error = new NotFoundException(`Owner ${OWNER_ID} not found`);
      ownerServiceMock.findById.mockRejectedValue(error);

      await expect(controller.findOne(OWNER_ID)).rejects.toThrow(error);
    });
  });

  // ─── GET /owners/address/:publicAddress ────────────────────────────────
  describe('findByAddress', () => {
    it('returns the owner when the address is registered', async () => {
      const fakeOwner = createTestOwner();
      ownerServiceMock.findByPublicAddress.mockResolvedValue(fakeOwner);

      const result = await controller.findByAddress(PUBLIC_ADDRESS);

      expect(ownerServiceMock.findByPublicAddress).toHaveBeenCalledWith(PUBLIC_ADDRESS);
      expect(result).toEqual(fakeOwner);
    });

    it('throws NotFoundException (404) if the address is not registered', async () => {
      ownerServiceMock.findByPublicAddress.mockResolvedValue(null);

      await expect(controller.findByAddress(PUBLIC_ADDRESS)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
