import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { DbService } from './db.service';
import { SeedService } from './seed.service';

@Module({
  providers: [DbService, SeedService, CleanupService],
  exports: [DbService],
})
export class DbModule {}
