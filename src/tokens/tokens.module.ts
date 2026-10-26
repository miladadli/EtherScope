import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from './token.entity';
import { TokensRepository } from './tokens.repository';
import { TokensService } from './tokens.service';

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity])],
  providers: [TokensRepository, TokensService],
  exports: [TokensRepository, TokensService],
})
export class TokensModule {}
