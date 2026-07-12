import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('accounts')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * POST /accounts
   * Creates a new account for the owner with the specified ticker (PET or CAT).
   * AccountBalance is initialized to zero inside AccountService.create()
   */
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates a new account for the owner with the given ticker. Only one ' +
      'account per (ownerId, ticker) pair is allowed — enforced by a unique ' +
      'constraint in the schema.',
  })
  @ApiResponse({ status: 201, description: 'Account created.' })
  @ApiResponse({ status: 409, description: 'Account for this owner + ticker already exists.' })
  @Post()
  async create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  /**
   * GET /accounts/:id
   * Returns the account along with the current cached balance
   */
  @ApiOperation({ summary: 'Get an account by id, including its cached balance' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Account found.' })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountService.findById(id);
  }

  /**
   * GET /accounts/:id/balance
   * Returns only the balance — cheaper than loading the entire account.
   * Balance is in elementary units (PAW or CLAW).
   * BigIntInterceptor will turn bigint into string on output
   */
  @ApiOperation({
    summary: 'Get only the balance of an account',
    description:
      'Cheaper than loading the whole account. Balance is in elementary ' +
      'units (PAW or CLAW) and is serialized as a string by BigIntInterceptor.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Balance found.' })
  @ApiResponse({ status: 404, description: 'Account (or its balance record) not found.' })
  @Get(':id/balance')
  async getBalance(@Param('id', ParseUUIDPipe) id: string) {
    const balance = await this.accountService.getBalance(id);
    return { accountId: id, balance };
  }

  /**
   * GET /accounts/owner/:ownerId
   * All accounts of one owner with balances.
   * An owner can have at most one account per ticker
   * (enforced by the @@unique([ownerId, ticker]) constraint in the schema).
   */
  @ApiOperation({
    summary: "List all of an owner's accounts",
    description:
      'An owner can have at most one account per ticker, so this returns at ' +
      'most one entry per SupportedTickers value.',
  })
  @ApiParam({ name: 'ownerId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of accounts (possibly empty).' })
  @Get('owner/:ownerId')
  async findByOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    return this.accountService.findByOwner(ownerId);
  }
}
