// ── AccountController Tests ────────────────────────────────────────────────
// Unit tests for AccountController — validate that each endpoint delegates
// correctly to AccountService and returns the expected shape.
// The AccessTokenGuard is overridden with a mock that always passes.
// All mocks are reset after each test to ensure isolation

import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { SupportedTickers } from '@prisma/client';

// ─── Test Identifiers ─────────────────────────────────────────────────────
const CORRECT_OWNER_ID = '22222222-2222-4222-a222-222222222222';
const CORRECT_ACCOUNT_ID = '11111111-1111-4111-a111-111111111111';
const STARTING_BALANCE = 1000n;

// ─── Mock Guard ───────────────────────────────────────────────────────────
class MockAccessTokenGuard {
  canActivate() {
    return true;
  }
}

// ─── Test Entity Factories ────────────────────────────────────────────────
function createTestAccount(overrides: Record<string, any> = {}) {
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

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('AccountController', () => {
  let controller: AccountController;
  let accountServiceMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            getBalance: jest.fn(),
            findByOwner: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useClass(MockAccessTokenGuard)
      .compile();

    controller = module.get<AccountController>(AccountController);
    accountServiceMock = module.get(AccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /accounts ─────────────────────────────────────────────────────
  describe('create', () => {
    it('delegates to accountService.create with the whole DTO and returns the result', async () => {
      const dto: CreateAccountDto = {
        ownerId: CORRECT_OWNER_ID,
        ticker: SupportedTickers.PET,
      };
      const fakeAccount = createTestAccount();
      accountServiceMock.create.mockResolvedValue(fakeAccount);

      const result = await controller.create(dto);

      expect(accountServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(fakeAccount);
    });

    it('forwards an optional initialBalance as part of the DTO', async () => {
      const dto: CreateAccountDto = {
        ownerId: CORRECT_OWNER_ID,
        ticker: SupportedTickers.PET,
        initialBalance: STARTING_BALANCE.toString(),
      };
      const fakeAccount = createTestAccount();
      accountServiceMock.create.mockResolvedValue(fakeAccount);

      await controller.create(dto);

      expect(accountServiceMock.create).toHaveBeenCalledWith(dto);
    });

    it('propagates any error thrown by the service', async () => {
      const dto: CreateAccountDto = {
        ownerId: CORRECT_OWNER_ID,
        ticker: SupportedTickers.PET,
      };
      const error = new Error('Service create error');
      accountServiceMock.create.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });
  });

  // ─── GET /accounts/:id ──────────────────────────────────────────────────
  describe('findOne', () => {
    it('delegates to accountService.findById and returns the account', async () => {
      const fakeAccount = createTestAccount();
      accountServiceMock.findById.mockResolvedValue(fakeAccount);

      const result = await controller.findOne(CORRECT_ACCOUNT_ID);

      expect(accountServiceMock.findById).toHaveBeenCalledWith(
        CORRECT_ACCOUNT_ID,
      );
      expect(result).toEqual(fakeAccount);
    });

    it('propagates errors from the service (e.g. NotFoundException)', async () => {
      const error = new Error('Account not found');
      accountServiceMock.findById.mockRejectedValue(error);

      await expect(controller.findOne(CORRECT_ACCOUNT_ID)).rejects.toThrow(error);
    });
  });

  // ─── GET /accounts/:id/balance ──────────────────────────────────────────
  describe('getBalance', () => {
    it('delegates to accountService.getBalance and wraps the value in an object', async () => {
      accountServiceMock.getBalance.mockResolvedValue(STARTING_BALANCE);

      const result = await controller.getBalance(CORRECT_ACCOUNT_ID);

      expect(accountServiceMock.getBalance).toHaveBeenCalledWith(
        CORRECT_ACCOUNT_ID,
      );
      expect(result).toEqual({
        accountId: CORRECT_ACCOUNT_ID,
        balance: STARTING_BALANCE,
      });
    });

    it('propagates errors from the service', async () => {
      const error = new Error('Balance not found');
      accountServiceMock.getBalance.mockRejectedValue(error);

      await expect(controller.getBalance(CORRECT_ACCOUNT_ID)).rejects.toThrow(error);
    });
  });

  // ─── GET /accounts/owner/:ownerId ───────────────────────────────────────
  describe('findByOwner', () => {
    it('delegates to accountService.findByOwner and returns the list of accounts', async () => {
      const accounts = [
        createTestAccount(),
        createTestAccount({ id: '33333333-3333-4333-a333-333333333333' }),
      ];
      accountServiceMock.findByOwner.mockResolvedValue(accounts);

      const result = await controller.findByOwner(CORRECT_OWNER_ID);

      expect(accountServiceMock.findByOwner).toHaveBeenCalledWith(
        CORRECT_OWNER_ID,
      );
      expect(result).toEqual(accounts);
    });

    it('propagates errors from the service', async () => {
      const error = new Error('DB query failed');
      accountServiceMock.findByOwner.mockRejectedValue(error);

      await expect(controller.findByOwner(CORRECT_OWNER_ID)).rejects.toThrow(error);
    });
  });
});
