import { Module } from '@nestjs/common';

import { EntriesController, PaymentsController } from './ledger.controller';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [EntriesController, PaymentsController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
