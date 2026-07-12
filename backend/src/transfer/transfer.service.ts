import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from '../account/account.service';
import { EntryType, Transfer, TransferStatus } from '@prisma/client';
import { CreateTransferDto } from './dto/create-transfer.dto';

// Custom error, declared above its first use so it reads top-to-bottom
class InsufficientFundsError extends Error {
  constructor(public readonly accountId: string) {
    super(`Insufficient funds: ${accountId}`);
  }
}

export interface TransferResult {
  transfer: Transfer;
  newFromBalance: bigint;
  newToBalance: bigint;
}

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Moves `amount` from one account to another.
   *
   * Steps:
   *  1. Validate accounts exist, are distinct, and share the same ticker.
   *  2. Create a `pending` Transfer record up-front, so the attempt is
   *     tracked even if the balance update fails.
   *  3. Inside a single DB transaction: debit the sender (guarded by a
   *     `balance >= amount` condition), credit the recipient, write matching
   *     LedgerEntry rows, and flip the Transfer to `completed`.
   *  4. On any failure, mark the Transfer as `failed` and rethrow
   *     (insufficient funds is translated into a 400 Bad Request).
   *
   * Deadlock avoidance: both directions of a transfer can run concurrently
   * (A→B and B→A). Always locking "debit first, then credit" would let two
   * concurrent transfers deadlock on each other's rows. Instead, the two
   * account ids are compared and the balance update with the lexicographically
   * smaller accountId always runs first, giving every transaction a consistent
   * lock order regardless of transfer direction.
   */
  async createTransfer(dto: CreateTransferDto): Promise<TransferResult> {
    const { fromAccountId, toAccountId, amount } = dto;

    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.accountService.findById(fromAccountId),
      this.accountService.findById(toAccountId),
    ]);

    if (!fromAccount) throw new NotFoundException(`Account ${fromAccountId} not found`);
    if (!toAccount) throw new NotFoundException(`Account ${toAccountId} not found`);

    if (fromAccount.ticker !== toAccount.ticker) {
      throw new BadRequestException(
        `Ticker mismatch: ${fromAccount.ticker} → ${toAccount.ticker}`,
      );
    }

    // Created before the transaction so its status can be tracked (and
    // flipped to `failed`) even if the transaction below rolls back.
    const transfer = await this.prisma.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        amount,
        status: TransferStatus.pending,
      },
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Deadlock avoidance: sort by accountId for a predictable lock order
        const isFromFirst = fromAccountId < toAccountId;

        let debitResult;

        if (isFromFirst) {
          // Debit first, then credit
          debitResult = await tx.accountBalance.updateMany({
            where: { accountId: fromAccountId, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
          await tx.accountBalance.update({
            where: { accountId: toAccountId },
            data: { balance: { increment: amount } },
          });
        } else {
          // Recipient's id sorts first, so lock it (credit) before debiting
          await tx.accountBalance.update({
            where: { accountId: toAccountId },
            data: { balance: { increment: amount } },
          });
          debitResult = await tx.accountBalance.updateMany({
            where: { accountId: fromAccountId, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
        }

        if (debitResult.count === 0) {
          throw new InsufficientFundsError(fromAccountId);
        }

        // Ledger entries
        await tx.ledgerEntry.createMany({
          data: [
            {
              accountId: fromAccountId,
              type: EntryType.debit,
              amount,
              transferId: transfer.id,
              description: `Transfer to ${toAccountId}`,
            },
            {
              accountId: toAccountId,
              type: EntryType.credit,
              amount,
              transferId: transfer.id,
              description: `Transfer from ${fromAccountId}`,
            },
          ],
        });

        // Mark the previously-created transfer as completed
        const completedTransfer = await tx.transfer.update({
          where: { id: transfer.id },
          data: { status: TransferStatus.completed },
        });

        // Read the resulting balances sequentially (no Promise.all inside
        // the transaction, to avoid opening two concurrent queries on the
        // same transaction client).
        const fromBalance = await tx.accountBalance.findUniqueOrThrow({
          where: { accountId: fromAccountId },
        });
        const toBalance = await tx.accountBalance.findUniqueOrThrow({
          where: { accountId: toAccountId },
        });

        return {
          transfer: completedTransfer,
          newFromBalance: fromBalance.balance,
          newToBalance: toBalance.balance,
        };
      });
    } catch (err) {
      // The transfer failed — mark it as such
      await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.failed },
      });

      if (err instanceof InsufficientFundsError) {
        throw new BadRequestException(`Insufficient funds on account ${fromAccountId}`);
      }

      throw err;
    }
  }

  /**
   * Finds a single transfer by id, including its ledger entries.
   * Throws NotFoundException if the transfer does not exist.
   */
  async findById(id: string): Promise<Transfer> {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: { ledgerEntries: true },
    });
    if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
    return transfer;
  }

  /**
   * Lists transfers where the given account was either the sender or the
   * recipient, optionally filtered by status, newest first.
   */
  async findByAccount(
    accountId: string,
    status?: TransferStatus,
  ): Promise<Transfer[]> {
    return this.prisma.transfer.findMany({
      where: {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
