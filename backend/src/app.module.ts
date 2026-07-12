import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

import { OwnerModule } from './owner/owner.module';
import { AccountModule } from './account/account.module';
import { TransferModule } from './transfer/transfer.module';
import { AuthModule } from './auth/auth.module';

/**
 * Root application module — wires together configuration, the Prisma data
 * layer, authentication, and the owner/account/transfer feature modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OwnerModule,
    AccountModule,
    TransferModule,
  ],
})
export class AppModule {}
