import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  ConflictException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OwnerService } from './owner.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateOwnerDto } from './dto/create-owner.dto';

@ApiTags('owners')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('owners')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  /**
   * POST /owners
   * Registers a new owner by publicAddress.
   * Returns 409 Conflict if the address is already taken.
   */
  @ApiOperation({ summary: 'Register a new owner by wallet address' })
  @ApiResponse({ status: 201, description: 'Owner created.' })
  @ApiResponse({ status: 409, description: 'Address is already registered.' })
  @Post()
  async create(@Body() dto: CreateOwnerDto) {
    const existing = await this.ownerService.findByPublicAddress(dto.publicAddress);
    if (existing) {
      throw new ConflictException(
        `Owner with address ${dto.publicAddress} already exists`,
      );
    }
    return this.ownerService.create(dto.publicAddress);
  }

  /**
   * GET /owners/:id
   * Returns the owner by UUID
   */
  @ApiOperation({ summary: 'Get an owner by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Owner found.' })
  @ApiResponse({ status: 404, description: 'Owner not found.' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ownerService.findById(id);
  }

  /**
   * GET /owners/address/:publicAddress
   * Convenience lookup by wallet address (used during Web3 auth).
   * Returns 404 Not Found if no owner has this address.
   */
  @ApiOperation({
    summary: 'Get an owner by wallet address',
    description: 'Convenience lookup used during the Web3 authentication flow.',
  })
  @ApiParam({ name: 'publicAddress', example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' })
  @ApiResponse({ status: 200, description: 'Owner found.' })
  @ApiResponse({ status: 404, description: 'No owner registered with this address.' })
  @Get('address/:publicAddress')
  async findByAddress(@Param('publicAddress') publicAddress: string) {
    const owner = await this.ownerService.findByPublicAddress(publicAddress);
    if (!owner) {
      // OwnerService.findByPublicAddress() returns null instead of throwing —
      // the controller is responsible for turning that into a 404 here.
      throw new NotFoundException(`Owner with address ${publicAddress} not found`);
    }
    return owner;
  }
}
