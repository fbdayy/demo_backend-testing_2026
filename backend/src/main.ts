import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/bigint.interceptor';

/**
 * Application entry point.
 * Wires up global validation (strips unknown properties, transforms
 * payloads into their DTO classes), the BigIntInterceptor, which is
 * required because balances/amounts are bigint and JSON.stringify()
 * cannot serialize them on its own, and the Swagger/OpenAPI docs.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new BigIntInterceptor());

  // Swagger / OpenAPI docs, served at /api. Access tokens can be pasted into
  // the "Authorize" button in the UI (bearer auth, matches AccessTokenGuard).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mini bank API')
    .setDescription(
      'Wallet-style API: owners authenticate with an Ethereum signature, ' +
        'hold PET/CAT accounts, and transfer balances between accounts.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token issued by POST /auth/login (or /auth/refresh).',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap();
