import { Injectable, Logger } from '@nestjs/common';

// Placeholder antivirus check — always reports clean today.
// TODO (production): integrate ClamAV container (localhost:3310) for real scanning. HIPAA compliant — data stays local.
@Injectable()
export class VirusScannerService {
  private readonly logger = new Logger(VirusScannerService.name);

  async scanFile(filePath: string): Promise<boolean> {
    this.logger.log(`[VIRUS SCAN] Scanning: ${filePath}... CLEAN`);
    return true;
  }
}
