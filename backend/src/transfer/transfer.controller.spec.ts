// ── TransferController Tests ────────────────────────────────────────────────
// Unit tests for TransferController — validate that each endpoint delegates
// correctly to TransferService and shapes the response as expected.
// The AccessTokenGuard is overridden with a mock that always passes.

import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferStatus } from '@prisma/client';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const ACCOUNT_A = '11111111-1111-4111-a111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-a222-222222222222';
const TRANSFER_ID = '33333333-3333-4333-a333-333333333333';
const AMOUNT = 500n;

// ─── Mock Guard ───────────────────────────────────────────────────────────
class MockAccessTokenGuard {
  canActivate() {
    return true;
  }
}

// ─── Test Entity Factories ────────────────────────────────────────────────
function createTestTransfer(overrides: Record<string, any> = {}) {
  return {
    id: TRANSFER_ID,
    fromAccountId: ACCOUNT_A,
    toAccountId: ACCOUNT_B,
    amount: AMOUNT,
    status: TransferStatus.completed,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('TransferController', () => {
  let controller: TransferController;
  let transferServiceMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferService,
          useValue: {
            createTransfer: jest.fn(),
            findById: jest.fn(),
            findByAccount: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useClass(MockAccessTokenGuard)
      .compile();

    controller = module.get<TransferController>(TransferController);
    transferServiceMock = module.get(TransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /transfers ────────────────────────────────────────────────────
  describe('create', () => {
    it('delegates to transferService.createTransfer and flattens the result', async () => {
      const dto: CreateTransferDto = Object.assign(new CreateTransferDto(), {
        fromAccountId: ACCOUNT_A,
        toAccountId: ACCOUNT_B,
        amount: AMOUNT,
      });
      const transfer = createTestTransfer();
      transferServiceMock.createTransfer.mockResolvedValue({
        transfer,
        newFromBalance: 500n,
        newToBalance: 1500n,
      });

      const result = await controller.create(dto);

      expect(transferServiceMock.createTransfer).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        transferId: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
        newFromBalance: 500n,
        newToBalance: 1500n,
        createdAt: transfer.createdAt,
      });
    });

    it('propagates errors from the service (e.g. insufficient funds)', async () => {
      const dto: CreateTransferDto = Object.assign(new CreateTransferDto(), {
        fromAccountId: ACCOUNT_A,
        toAccountId: ACCOUNT_B,
        amount: AMOUNT,
      });
      const error = new Error('Insufficient funds');
      transferServiceMock.createTransfer.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });
  });

  // ─── GET /transfers/account/:accountId ──────────────────────────────────
  describe('findByAccount', () => {
    it('delegates to transferService.findByAccount without a status filter', async () => {
      const transfers = [createTestTransfer()];
      transferServiceMock.findByAccount.mockResolvedValue(transfers);

      const result = await controller.findByAccount(ACCOUNT_A, undefined);

      expect(transferServiceMock.findByAccount).toHaveBeenCalledWith(ACCOUNT_A, undefined);
      expect(result).toEqual(transfers);
    });

    it('forwards a status filter when provided', async () => {
      transferServiceMock.findByAccount.mockResolvedValue([]);

      await controller.findByAccount(ACCOUNT_A, TransferStatus.pending);

      expect(transferServiceMock.findByAccount).toHaveBeenCalledWith(
        ACCOUNT_A,
        TransferStatus.pending,
      );
    });
  });

  // ─── GET /transfers/:id ─────────────────────────────────────────────────
  describe('findOne', () => {
    it('delegates to transferService.findById and returns the transfer', async () => {
      const transfer = createTestTransfer();
      transferServiceMock.findById.mockResolvedValue(transfer);

      const result = await controller.findOne(TRANSFER_ID);

      expect(transferServiceMock.findById).toHaveBeenCalledWith(TRANSFER_ID);
      expect(result).toEqual(transfer);
    });

    it('propagates errors from the service (e.g. NotFoundException)', async () => {
      const error = new Error('Transfer not found');
      transferServiceMock.findById.mockRejectedValue(error);

      await expect(controller.findOne(TRANSFER_ID)).rejects.toThrow(error);
    });
  });
});
