import { Module } from '@nestjs/common';
import { VirusScannerService } from './virus-scanner.service';

@Module({
  providers: [VirusScannerService],
  exports: [VirusScannerService],
})
export class CommonModule {}
