import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import type { Response } from 'express';

import { JalaliMonth } from '../../common/jalali';
import { text } from '../../i18n';
import { monthWorkbook } from './month-export';
import type { MonthReport } from './month-report';
import { ReportsService } from './reports.service';

class MonthQueryDto {
  @Type(() => Number)
  @IsInt()
  year: number;

  @Type(() => Number)
  @IsInt()
  month: number;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('months')
  months(): Promise<JalaliMonth[]> {
    return this.reports.months();
  }

  @Get('month')
  month(@Query() query: MonthQueryDto): Promise<MonthReport> {
    return this.reports.month(query);
  }

  @Get('month/export')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async export(
    @Query() query: MonthQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const report = await this.reports.month(query);
    const name = `${text.export.fileName}-${query.year}-${String(query.month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    return new StreamableFile(await monthWorkbook(report));
  }
}
