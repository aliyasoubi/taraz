import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  EntryDto,
  PaymentDto,
  UpdateEntryDto,
  UpdatePaymentDto,
} from './ledger.dto';
import { EntryView, LedgerService } from './ledger.service';

@Controller('entries')
export class EntriesController {
  constructor(private readonly ledger: LedgerService) {}

  @Post()
  create(@Body() dto: EntryDto): Promise<EntryView> {
    return this.ledger.createEntry(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<EntryView> {
    return this.ledger.getEntry(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
  ): Promise<EntryView> {
    return this.ledger.updateEntry(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ledger.deleteEntry(id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentDto,
  ): Promise<EntryView> {
    return this.ledger.addPayment(id, dto);
  }

  @Post(':id/apply-deposits')
  @HttpCode(200)
  applyDeposits(@Param('id', ParseUUIDPipe) id: string): Promise<EntryView> {
    return this.ledger.applyDeposits(id);
  }
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly ledger: LedgerService) {}

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ): Promise<EntryView> {
    return this.ledger.updatePayment(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<EntryView> {
    return this.ledger.deletePayment(id);
  }
}
