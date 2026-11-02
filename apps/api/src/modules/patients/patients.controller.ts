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
  Query,
} from '@nestjs/common';

import { EntryView, LedgerService } from '../ledger/ledger.service';
import { PatientDto, PatientQueryDto, UpdatePatientDto } from './patients.dto';
import {
  PatientPage,
  PatientSummary,
  PatientsService,
} from './patients.service';

export interface PatientDetail extends PatientSummary {
  note: string | null;
  createdAt: Date;
  entries: EntryView[];
}

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly ledger: LedgerService,
  ) {}

  @Get()
  list(@Query() query: PatientQueryDto): Promise<PatientPage> {
    return this.patients.list(query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<PatientDetail> {
    const [patient, summary, entries] = await Promise.all([
      this.patients.get(id),
      this.patients.summary(id),
      this.ledger.entriesOf(id),
    ]);
    return {
      ...summary,
      note: patient.note,
      createdAt: patient.createdAt,
      entries,
    };
  }

  @Post()
  async create(@Body() dto: PatientDto): Promise<PatientSummary> {
    const patient = await this.patients.create(dto);
    return this.patients.summary(patient.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ): Promise<PatientSummary> {
    await this.patients.update(id, dto);
    return this.patients.summary(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.patients.remove(id);
  }
}
