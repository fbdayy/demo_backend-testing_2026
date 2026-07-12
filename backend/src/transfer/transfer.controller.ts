import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferStatus } from '@prisma/client';

@ApiTags('transfers')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * POST /transfers
   * Moves funds between two accounts and returns the resulting balances.
   */
  @ApiOperation({
    summary: 'Transfer funds between two accounts',
    description:
      'Debits fromAccountId and credits toAccountId atomically. Fails with ' +
      '400 if the sender has insufficient funds or the tickers do not match.',
  })
  @ApiResponse({ status: 201, description: 'Transfer completed; resulting balances returned.' })
  @ApiResponse({ status: 400, description: 'Insufficient funds, same account, or ticker mismatch.' })
  @ApiResponse({ status: 404, description: 'One of the accounts does not exist.' })
  @Post()
  async create(@Body() dto: CreateTransferDto) {
    const result = await this.transferService.createTransfer(dto);
    return {
      transferId: result.transfer.id,
      status: result.transfer.status,
      amount: result.transfer.amount,
      newFromBalance: result.newFromBalance,
      newToBalance: result.newToBalance,
      createdAt: result.transfer.createdAt,
    };
  }

  /**
   * GET /transfers/account/:accountId
   * Lists transfers involving the given account (as sender or recipient),
   * optionally filtered by status.
   *
   * NOTE: this static/specific route is declared BEFORE `GET /transfers/:id`
   * on purpose — NestJS matches routes in declaration order, and ':id' would
   * otherwise greedily match the literal segment 'account' as an id.
   */
  @ApiOperation({
    summary: 'List transfers involving an account',
    description: 'Returns transfers where the account is either the sender or the recipient.',
  })
  @ApiParam({ name: 'accountId', format: 'uuid' })
  @ApiQuery({ name: 'status', enum: TransferStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of transfers (possibly empty).' })
  @Get('account/:accountId')
  async findByAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    // ParseEnumPipe guards against invalid status values in the query string
    @Query('status', new ParseEnumPipe(TransferStatus, { optional: true })) status?: TransferStatus,
  ) {
    return this.transferService.findByAccount(accountId, status);
  }

  /**
   * GET /transfers/:id
   * Returns a single transfer, including its ledger entries.
   */
  @ApiOperation({ summary: 'Get a transfer by id, including its ledger entries' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transfer found.' })
  @ApiResponse({ status: 404, description: 'Transfer not found.' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transferService.findById(id);
  }
}
