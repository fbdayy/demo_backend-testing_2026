// ── Account Service ──────────────────────────────────────────────────────────
// All balance operations go through this service, but!
// AccountBalance is only a cache! The single source of truth is ledger entries in LedgerEntry.
// Any balance change should ideally be accompanied by a debit/credit entry,
// and this service is a convenient layer for reading and initial setup.

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

// ── Types ─────────────────────────────────────────────────────────────────────
// Awaited<ReturnType<...>> always matches the actual return of findById
export type AccountWithBalance = Awaited<ReturnType<AccountService['findById']>>;

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Account Creation ───────────────────────────────────────────────────────
  /**
   * Creates an account for the owner with the specified ticker and optional initial balance.
   * The balance is stored in the AccountBalance cache and should be accompanied by
   * a corresponding LedgerEntry (handled by a separate transaction layer).
   *
   * @param dto - ownerId, ticker and optional initialBalance (elementary units, as a string)
   * @returns created account with its balance cache
   *
   * Constraint: only one account per owner per ticker is allowed
   * (enforced by @@unique([ownerId, ticker]) in the schema)
   *
   * @remarks
   * TODO: when initialBalance is provided, this only seeds the AccountBalance cache.
   * No corresponding LedgerEntry is created, so the cache and the ledger can start
   * out of sync. Revisit once a dedicated "initial deposit" EntryType exists.
   */
  async create(dto: CreateAccountDto) {
    const initialBalance = dto.initialBalance ? BigInt(dto.initialBalance) : 0n;

    return this.prisma.$transaction(async (prisma) => {
      const account = await prisma.account.create({
        data: {
          ownerId: dto.ownerId,
          ticker: dto.ticker,
          balance: {
            create: { balance: initialBalance },
          },
        },
        include: { balance: true },
      });
      return account;
    });
  }

  // ── Find Account by Id ────────────────────────────────────────────────────
  /**
   * Finds an account by its id and includes the balance cache.
   * Throws NotFoundException if the account does not exist
   */
  async findById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: { balance: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    return account;
  }

  // ── All Accounts of an Owner ──────────────────────────────────────────────
  /**
   * Returns an array of all accounts associated with the given ownerId.
   * Each account includes its cached balance.
   * Order is arbitrary, but it may be useful to sort by ticker on the client
   */
  async findByOwner(ownerId: string) {
    return this.prisma.account.findMany({
      where: { ownerId },
      include: { balance: true },
    });
  }

  // ── Fast Balance Reading ──────────────────────────────────────────────────
  /**
   * Reads only the balance (in elementary units) for a given account.
   * This is a lightweight query to the AccountBalance cache, not pulling the whole Account model
   *
   * The balance is up-to-date if a recent transfer or LedgerEntry recalculation was done.
   * Otherwise, it is better to recalculate from Ledger
   */
  async getBalance(accountId: string): Promise<bigint> {
    const balance = await this.prisma.accountBalance.findUnique({
      where: { accountId },
    });

    if (!balance) {
      throw new NotFoundException(`Balance for account ${accountId} not found`);
    }

    return balance.balance;
  }
}
