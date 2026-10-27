import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

export async function bootstrapHttp(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('EtherScope')
    .setDescription(
      'Watch Ethereum addresses for native ETH and configured ERC-20 transfers. ' +
        'Seed via CLI; run API-only (`main-api`) and indexer (`main-indexer`) as separate processes when needed.',
    )
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`listening on :${port}`);
  logger.log(
    `roles indexer=${config.get('ENABLE_INDEXER', { infer: true })} balanceWorker=${config.get('ENABLE_BALANCE_WORKER', { infer: true })}`,
  );
  logger.log(`swagger UI at http://localhost:${port}/docs`);
}
