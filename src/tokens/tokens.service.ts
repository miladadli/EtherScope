import { Injectable } from '@nestjs/common';
import { TokensRepository } from './tokens.repository';

@Injectable()
export class TokensService {
  constructor(private readonly tokensRepository: TokensRepository) {}

  listEnabled() {
    return this.tokensRepository.findEnabled();
  }

  registerToken(input: {
    address: string;
    symbol: string;
    decimals: number;
  }) {
    return this.tokensRepository.upsertToken({
      address: input.address.toLowerCase(),
      symbol: input.symbol,
      decimals: input.decimals,
      enabled: true,
    });
  }
}
