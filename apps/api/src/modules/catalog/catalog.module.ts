import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from './account.entity';
import { AccountsController, DoctorsController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Doctor } from './doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Account])],
  controllers: [DoctorsController, AccountsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
