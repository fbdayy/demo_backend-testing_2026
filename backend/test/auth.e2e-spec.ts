import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ethers } from 'ethers';
import { AppModule } from '../app.module';

/*
 * These are well-known publicly-documented test keys (Hardhat/Anvil account #0).
 * Use them for testing only — never for anything that holds real funds.
 */
const CORRECT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CORRECT_PUBLIC_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Test 1: successful login
  it('should return access and refresh tokens for valid signature', async () => {
    // 1. Request a nonce
    const nonceRes = await request(app.getHttpServer())
      .post('/auth/nonce')
      .send({ publicAddress: CORRECT_PUBLIC_ADDRESS })
      .expect(200);

    const { message } = nonceRes.body;
    expect(message).toBeDefined();
    expect(typeof message).toBe('string');

    // 2. Sign the message with ethers
    const wallet = new ethers.Wallet(CORRECT_PRIVATE_KEY);
    const signature = await wallet.signMessage(message);

    // 3. Submit the login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        publicAddress: CORRECT_PUBLIC_ADDRESS,
        signature,
      })
      .expect(200);

    // Check the response shape
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');
    expect(typeof loginRes.body.accessToken).toBe('string');
    expect(typeof loginRes.body.refreshToken).toBe('string');
  });

  // Test 2: error on signature mismatch
  it('should return 401 when signature does not match the public address', async () => {
    const nonceRes = await request(app.getHttpServer())
      .post('/auth/nonce')
      .send({ publicAddress: CORRECT_PUBLIC_ADDRESS })
      .expect(200);

    const { message } = nonceRes.body;

    // Sign with a wallet unrelated to our target address
    const randomWallet = ethers.Wallet.createRandom();
    const wrongSignature = await randomWallet.signMessage(message);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        publicAddress: CORRECT_PUBLIC_ADDRESS,
        signature: wrongSignature,
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body).toHaveProperty('error');
  });
});
