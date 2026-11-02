import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { Account } from './account.entity';
import {
  AccountDto,
  DoctorDto,
  UpdateAccountDto,
  UpdateDoctorDto,
} from './catalog.dto';
import { CatalogService } from './catalog.service';
import { Doctor } from './doctor.entity';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(): Promise<Doctor[]> {
    return this.catalog.listDoctors();
  }

  @Post()
  create(@Body() dto: DoctorDto): Promise<Doctor> {
    return this.catalog.createDoctor(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<Doctor> {
    return this.catalog.updateDoctor(id, dto);
  }
}

@Controller('accounts')
export class AccountsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(): Promise<Account[]> {
    return this.catalog.listAccounts();
  }

  @Post()
  create(@Body() dto: AccountDto): Promise<Account> {
    return this.catalog.createAccount(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<Account> {
    return this.catalog.updateAccount(id, dto);
  }
}
