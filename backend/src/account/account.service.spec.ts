// ── AccountService Tests ───────────────────────────────────────────────────
// Tests for AccountService — covering creation, retrieval, and balance reading
// IMPORTANT: All tests are isolated; factories return fresh objects to avoid
// accidentally sharing state between test cases

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { SupportedTickers, Account, AccountBalance } from '@prisma/client';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const CORRECT_OWNER_ID = '22222222-2222-4222-a222-222222222222';
const CORRECT_ACCOUNT_ID = '11111111-1111-4111-a111-111111111111';
const STARTING_BALANCE = 1000n;

// ─── Test Entity Factories ────────────────────────────────────────────────
// Always return a new object for test isolation

/**
 * Creates a test account with an attached balance.
 * Any fields can be overridden via overrides
 */
function createTestAccount(
  overrides: Partial<Account & { balance: AccountBalance | null }> = {},
) {
  return {
    id: CORRECT_ACCOUNT_ID,
    ownerId: CORRECT_OWNER_ID,
    ticker: SupportedTickers.PET,
    createdAt: new Date(),
    updatedAt: new Date(),
    balance: {
      accountId: CORRECT_ACCOUNT_ID,
      balance: STARTING_BALANCE,
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

/**
 * Creates a balance record (separate from account).
 * Used for testing getBalance when account is not needed
 */
function createTestBalance(
  overrides: Partial<AccountBalance> = {},
) {
  return {
    accountId: CORRECT_ACCOUNT_ID,
    balance: STARTING_BALANCE,
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a valid CreateAccountDto, allowing overrides
 * (e.g. to attach an initialBalance).
 */
function createDto(overrides: Partial<CreateAccountDto> = {}): CreateAccountDto {
  return Object.assign(
    new CreateAccountDto(),
    {
      ownerId: CORRECT_OWNER_ID,
      ticker: SupportedTickers.PET,
    },
    overrides,
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('AccountService', () => {
  let service: AccountService;
  let prismaMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: PrismaService,
          useValue: {
            // AccountService.create() runs inside prisma.$transaction(), so the
            // mock forwards the callback a "tx" object with the same shape as
            // the top-level client.
            $transaction: jest.fn((callback: any) =>
              callback({
                account: { create: jest.fn() },
              }),
            ),
            account: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            accountBalance: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(AccountService);
    prismaMock = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('service should be defined (basic check)', () => {
    expect(service).toBeDefined();
  });

  // ─── Account Creation ────────────────────────────────────────────────────
  describe('create', () => {
    const expectedCreateArgs = {
      data: {
        ownerId: CORRECT_OWNER_ID,
        ticker: SupportedTickers.PET,
        balance: { create: { balance: 0n } },
      },
      include: { balance: true },
    };

    // Helper to make $transaction hand back a controllable `tx.account.create` mock
    function mockTransactionAccountCreate(resolvedValue: any) {
      const txAccountCreate = jest.fn().mockResolvedValue(resolvedValue);
      prismaMock.$transaction.mockImplementation((callback: any) =>
        callback({ account: { create: txAccountCreate } }),
      );
      return txAccountCreate;
    }

    it('creates an account with a zero balance when initialBalance is omitted', async () => {
      const fakeAccount = createTestAccount({
        balance: { accountId: CORRECT_ACCOUNT_ID, balance: 0n, updatedAt: new Date() },
      });
      const txAccountCreate = mockTransactionAccountCreate(fakeAccount);

      const result = await service.create(createDto());

      expect(txAccountCreate).toHaveBeenCalledWith(expectedCreateArgs);
      expect(result).toEqual(fakeAccount);
      expect(result.balance?.balance).toBe(0n);
    });

    it('creates an account seeded with the given initialBalance', async () => {
      const fakeAccount = createTestAccount();
      const txAccountCreate = mockTransactionAccountCreate(fakeAccount);

      const result = await service.create(
        createDto({ initialBalance: STARTING_BALANCE.toString() }),
      );

      expect(txAccountCreate).toHaveBeenCalledWith({
        ...expectedCreateArgs,
        data: {
          ...expectedCreateArgs.data,
          balance: { create: { balance: STARTING_BALANCE } },
        },
      });
      expect(result.balance?.balance).toBe(STARTING_BALANCE);
    });

    it('throws uniqueness error (P2002) if account already exists', async () => {
      // Prisma throws a known error when a unique constraint is violated
      const duplicateError = new PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '4.0.0',
      });
      prismaMock.$transaction.mockRejectedValue(duplicateError);

      await expect(service.create(createDto())).rejects.toThrow(duplicateError);
    });
  });

  // ─── Find by ID ──────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns account with balance if it exists in DB', async () => {
      const accountData = createTestAccount();
      prismaMock.account.findUnique.mockResolvedValue(accountData);

      const result = await service.findById(CORRECT_ACCOUNT_ID);

      expect(prismaMock.account.findUnique).toHaveBeenCalledWith({
        where: { id: CORRECT_ACCOUNT_ID },
        include: { balance: true },
      });
      expect(result).toEqual(accountData);
    });

    it('throws NotFoundException if account is not found', async () => {
      prismaMock.account.findUnique.mockResolvedValue(null);

      await expect(service.findById(CORRECT_ACCOUNT_ID)).rejects.toThrow(
        new NotFoundException(`Account ${CORRECT_ACCOUNT_ID} not found`),
      );
    });

    it('correctly handles case when balance is absent (null)', async () => {
      // This could happen if the balance record is not created (should not happen by design)
      const accountWithoutBalance = createTestAccount({ balance: null });
      prismaMock.account.findUnique.mockResolvedValue(accountWithoutBalance);

      const result = await service.findById(CORRECT_ACCOUNT_ID);

      expect(result).toEqual(accountWithoutBalance);
      expect(result.balance).toBeNull();
    });

    it('passes through any other database errors', async () => {
      const dbError = new Error('Network error when accessing DB');
      prismaMock.account.findUnique.mockRejectedValue(dbError);

      await expect(service.findById(CORRECT_ACCOUNT_ID)).rejects.toThrow(dbError);
    });
  });

  // ─── Find all accounts of owner ────────────────────────────────────────
  describe('findByOwner', () => {
    it('returns array of accounts belonging to the owner', async () => {
      const first = createTestAccount();
      const second = createTestAccount({
        id: '33333333-3333-4333-a333-333333333333',
      });
      const accountList = [first, second];
      prismaMock.account.findMany.mockResolvedValue(accountList);

      const result = await service.findByOwner(CORRECT_OWNER_ID);

      expect(prismaMock.account.findMany).toHaveBeenCalledWith({
        where: { ownerId: CORRECT_OWNER_ID },
        include: { balance: true },
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(accountList);
    });

    it('returns empty array if owner has no accounts', async () => {
      prismaMock.account.findMany.mockResolvedValue([]);

      const result = await service.findByOwner(CORRECT_OWNER_ID);

      expect(result).toEqual([]);
    });

    it('throws any Prisma errors further', async () => {
      const error = new Error('Query timeout');
      prismaMock.account.findMany.mockRejectedValue(error);

      await expect(service.findByOwner(CORRECT_OWNER_ID)).rejects.toThrow(error);
    });
  });

  // ─── Balance Reading ────────────────────────────────────────────────────
  describe('getBalance', () => {
    it('returns numeric balance (bigint) by account ID', async () => {
      const balanceRecord = createTestBalance();
      prismaMock.accountBalance.findUnique.mockResolvedValue(balanceRecord);

      const result = await service.getBalance(CORRECT_ACCOUNT_ID);

      expect(prismaMock.accountBalance.findUnique).toHaveBeenCalledWith({
        where: { accountId: CORRECT_ACCOUNT_ID },
      });
      expect(result).toBe(STARTING_BALANCE);
    });

    it('throws NotFoundException if balance record is missing', async () => {
      prismaMock.accountBalance.findUnique.mockResolvedValue(null);

      await expect(service.getBalance(CORRECT_ACCOUNT_ID)).rejects.toThrow(
        new NotFoundException(`Balance for account ${CORRECT_ACCOUNT_ID} not found`),
      );
    });

    it('throws database access errors', async () => {
      const error = new Error('DB unavailable');
      prismaMock.accountBalance.findUnique.mockRejectedValue(error);

      await expect(service.getBalance(CORRECT_ACCOUNT_ID)).rejects.toThrow(error);
    });
  });
});
