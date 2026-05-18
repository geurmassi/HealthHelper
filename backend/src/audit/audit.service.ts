import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

// Inserts and reads audit rows for the audit_logs table.
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  log(entry: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepository.create(entry);
    return this.auditLogRepository.save(log);
  }

  findAll(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({ relations: ['user', 'referral'] });
  }
}
