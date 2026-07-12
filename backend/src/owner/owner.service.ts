import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Owner } from '@prisma/client';

@Injectable()
export class OwnerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds an owner by id.
   * Throws NotFoundException if the owner does not exist.
   */
  async findById(id: string): Promise<Owner> {
    const owner = await this.prisma.owner.findUnique({
      where: { id },
    });
    if (!owner) throw new NotFoundException(`Owner ${id} not found`);
    return owner;
  }

  /**
   * Finds an owner by wallet publicAddress.
   * Returns null (rather than throwing) when no match is found, since callers
   * use this both to check existence (create) and to look up (findByAddress).
   */
  async findByPublicAddress(publicAddress: string): Promise<Owner | null> {
    return this.prisma.owner.findUnique({ where: { publicAddress } });
  }

  /**
   * Creates a new owner for the given wallet publicAddress.
   */
  async create(publicAddress: string): Promise<Owner> {
    return this.prisma.owner.create({
      data: { publicAddress },
    });
  }
}
