// ── TransferService Tests ───────────────────────────────────────────────────
// Tests for TransferService — covers validation, the happy path in both
// lock-ordering directions, insufficient-funds handling, failure bookkeeping,
// and the read-only lookup methods.
// PrismaService.$transaction is mocked to simply invoke the callback with a
// `tx` stand-in that exposes the same methods used inside the transaction.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from '../account/account.service';
import { TransferService } from './transfer.service';
import {
  EntryType,
  SupportedTickers,
  TransferStatus,
} from '@prisma/client';
import { CreateTransferDto } from './dto/create-transfer.dto';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const ACCOUNT_A = '11111111-1111-4111-a111-111111111111'; // sorts before ACCOUNT_B
const ACCOUNT_B = '22222222-2222-4222-a222-222222222222';
const TRANSFER_ID = '33333333-3333-4333-a333-333333333333';
const AMOUNT = 500n;

// ─── Test Entity Factories ────────────────────────────────────────────────
function createTestAccount(overrides: Record<string, any> = {}) {
  return {
    id: ACCOUNT_A,
    ownerId: '99999999-9999-9999-9999-999999999999',
    ticker: SupportedTickers.PET,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestTransfer(overrides: Record<string, any> = {}) {
  return {
    id: TRANSFER_ID,
    fromAccountId: ACCOUNT_A,
    toAccountId: ACCOUNT_B,
    amount: AMOUNT,
    status: TransferStatus.pending,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createDto(overrides: Partial<CreateTransferDto> = {}): CreateTransferDto {
  return Object.assign(new CreateTransferDto(), {
    fromAccountId: ACCOUNT_A,
    toAccountId: ACCOUNT_B,
    amount: AMOUNT,
  }, overrides);
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('TransferService', () => {
  let service: TransferService;
  let prismaMock: any;
  let accountServiceMock: any;
  let txMock: any;

  beforeEach(async () => {
    // Stand-in for the `tx` client handed to the $transaction callback
    txMock = {
      accountBalance: {
        updateMany: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      ledgerEntry: { createMany: jest.fn() },
      transfer: { update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: PrismaService,
          useValue: {
            transfer: { create: jest.fn(), update: jest.fn() },
            $transaction: jest.fn((callback: any) => callback(txMock)),
          },
        },
        {
          provide: AccountService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TransferService);
    prismaMock = module.get(PrismaService);
    accountServiceMock = module.get(AccountService);

    // Default: both accounts exist, share the same ticker
    accountServiceMock.findById.mockImplementation((id: string) =>
      Promise.resolve(createTestAccount({ id })),
    );
    prismaMock.transfer.create.mockResolvedValue(createTestTransfer());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createTransfer: validation ──────────────────────────────────────────
  describe('createTransfer — validation', () => {
    it('throws BadRequestException when fromAccountId equals toAccountId', async () => {
      await expect(
        service.createTransfer(createDto({ toAccountId: ACCOUNT_A })),
      ).rejects.toThrow(BadRequestException);

      expect(accountServiceMock.findById).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException if an account does not exist', async () => {
      const error = new NotFoundException(`Account ${ACCOUNT_A} not found`);
      accountServiceMock.findById.mockRejectedValueOnce(error);

      await expect(service.createTransfer(createDto())).rejects.toThrow(error);
    });

    it('throws BadRequestException on ticker mismatch', async () => {
      accountServiceMock.findById.mockImplementation((id: string) =>
        Promise.resolve(
          createTestAccount({
            id,
            ticker: id === ACCOUNT_A ? SupportedTickers.PET : SupportedTickers.CAT,
          }),
        ),
      );

      await expect(service.createTransfer(createDto())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── createTransfer: happy path ──────────────────────────────────────────
  describe('createTransfer — happy path', () => {
    it('debits the sender first when fromAccountId sorts before toAccountId', async () => {
      txMock.accountBalance.updateMany.mockResolvedValue({ count: 1 });
      txMock.transfer.update.mockResolvedValue(
        createTestTransfer({ status: TransferStatus.completed }),
      );
      txMock.accountBalance.findUniqueOrThrow
        .mockResolvedValueOnce({ accountId: ACCOUNT_A, balance: 500n, updatedAt: new Date() })
        .mockResolvedValueOnce({ accountId: ACCOUNT_B, balance: 1500n, updatedAt: new Date() });

      const result = await service.createTransfer(createDto());

      const callOrder = [
        ...txMock.accountBalance.updateMany.mock.invocationCallOrder,
        ...txMock.accountBalance.update.mock.invocationCallOrder,
      ];
      // updateMany (debit) must have been invoked before update (credit)
      expect(txMock.accountBalance.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        txMock.accountBalance.update.mock.invocationCallOrder[0],
      );
      expect(txMock.accountBalance.updateMany).toHaveBeenCalledWith({
        where: { accountId: ACCOUNT_A, balance: { gte: AMOUNT } },
        data: { balance: { decrement: AMOUNT } },
      });
      expect(txMock.accountBalance.update).toHaveBeenCalledWith({
        where: { accountId: ACCOUNT_B },
        data: { balance: { increment: AMOUNT } },
      });
      expect(txMock.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ accountId: ACCOUNT_A, type: EntryType.debit }),
          expect.objectContaining({ accountId: ACCOUNT_B, type: EntryType.credit }),
        ],
      });
      expect(result).toEqual({
        transfer: expect.objectContaining({ status: TransferStatus.completed }),
        newFromBalance: 500n,
        newToBalance: 1500n,
      });
    });

    it('credits the recipient first when toAccountId sorts before fromAccountId', async () => {
      txMock.accountBalance.updateMany.mockResolvedValue({ count: 1 });
      txMock.transfer.update.mockResolvedValue(
        createTestTransfer({ status: TransferStatus.completed }),
      );
      txMock.accountBalance.findUniqueOrThrow.mockResolvedValue({
        accountId: ACCOUNT_A,
        balance: 0n,
        updatedAt: new Date(),
      });

      // Swap direction so toAccountId (ACCOUNT_A) sorts before fromAccountId (ACCOUNT_B)
      await service.createTransfer(
        createDto({ fromAccountId: ACCOUNT_B, toAccountId: ACCOUNT_A }),
      );

      expect(txMock.accountBalance.update.mock.invocationCallOrder[0]).toBeLessThan(
        txMock.accountBalance.updateMany.mock.invocationCallOrder[0],
      );
    });
  });

  // ─── createTransfer: failure handling ────────────────────────────────────
  describe('createTransfer — failure handling', () => {
    it('marks the transfer as failed and throws BadRequestException on insufficient funds', async () => {
      txMock.accountBalance.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.createTransfer(createDto())).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.transfer.update).toHaveBeenCalledWith({
        where: { id: TRANSFER_ID },
        data: { status: TransferStatus.failed },
      });
    });

    it('marks the transfer as failed and rethrows unexpected errors', async () => {
      const dbError = new Error('connection lost');
      txMock.accountBalance.updateMany.mockRejectedValue(dbError);

      await expect(service.createTransfer(createDto())).rejects.toThrow(dbError);

      expect(prismaMock.transfer.update).toHaveBeenCalledWith({
        where: { id: TRANSFER_ID },
        data: { status: TransferStatus.failed },
      });
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the transfer with its ledger entries', async () => {
      const transfer = createTestTransfer({ ledgerEntries: [] });
      prismaMock.transfer.findUnique = jest.fn().mockResolvedValue(transfer);

      const result = await service.findById(TRANSFER_ID);

      expect(prismaMock.transfer.findUnique).toHaveBeenCalledWith({
        where: { id: TRANSFER_ID },
        include: { ledgerEntries: true },
      });
      expect(result).toEqual(transfer);
    });

    it('throws NotFoundException if the transfer does not exist', async () => {
      prismaMock.transfer.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findById(TRANSFER_ID)).rejects.toThrow(
        new NotFoundException(`Transfer ${TRANSFER_ID} not found`),
      );
    });
  });

  // ─── findByAccount ───────────────────────────────────────────────────────
  describe('findByAccount', () => {
    it('queries transfers where the account is sender or recipient, newest first', async () => {
      const transfers = [createTestTransfer()];
      prismaMock.transfer.findMany = jest.fn().mockResolvedValue(transfers);

      const result = await service.findByAccount(ACCOUNT_A);

      expect(prismaMock.transfer.findMany).toHaveBeenCalledWith({
        where: { OR: [{ fromAccountId: ACCOUNT_A }, { toAccountId: ACCOUNT_A }] },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(transfers);
    });

    it('adds a status filter when provided', async () => {
      prismaMock.transfer.findMany = jest.fn().mockResolvedValue([]);

      await service.findByAccount(ACCOUNT_A, TransferStatus.completed);

      expect(prismaMock.transfer.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ fromAccountId: ACCOUNT_A }, { toAccountId: ACCOUNT_A }],
          status: TransferStatus.completed,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
