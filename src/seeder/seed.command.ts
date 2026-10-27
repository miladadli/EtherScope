import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { SeederService } from './seeder.service';

function readArg(name: string): string | undefined {
  const argv = process.argv;
  const long = `--${name}`;
  const eq = argv.find((a) => a.startsWith(`${long}=`));
  if (eq) {
    return eq.slice(long.length + 1);
  }
  const idx = argv.indexOf(long);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('-')) {
    return argv[idx + 1];
  }
  return undefined;
}

@Command({
  name: 'seed',
  description: 'Seed watched addresses, demo tokens, and sample transfers',
})
export class SeedCommand extends CommandRunner {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(private readonly seederService: SeederService) {
    super();
  }

  async run(
    _passed: string[],
    options: { count?: number; activeRatio?: number },
  ): Promise<void> {
    const countRaw = options.count ?? readArg('count');
    const ratioRaw = options.activeRatio ?? readArg('active-ratio');
    const count =
      countRaw !== undefined && countRaw !== ''
        ? Number(countRaw)
        : undefined;
    const activeRatio =
      ratioRaw !== undefined && ratioRaw !== ''
        ? Number(ratioRaw)
        : undefined;

    this.logger.log(
      `seed args count=${count ?? 'default'} activeRatio=${activeRatio ?? 'default'}`,
    );
    await this.seederService.seed({ count, activeRatio });
    this.logger.log('done');
  }

  @Option({
    flags: '-c, --count <number>',
    description: 'Number of addresses to seed (default from env)',
  })
  parseCount(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '-a, --active-ratio <number>',
    description: 'Fraction of addresses that receive activity (0-1)',
  })
  parseActiveRatio(value: string): number {
    return Number(value);
  }
}
