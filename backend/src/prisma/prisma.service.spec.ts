// ── PrismaService Tests ─────────────────────────────────────────────────────
// Confirms PrismaService wires $connect/$disconnect into Nest's module
// lifecycle hooks. Does not touch a real database — this only checks that
// onModuleInit/onModuleDestroy call through to the underlying PrismaClient methods.

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('connects on module init', async () => {
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined as any);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destroy', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as any);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
