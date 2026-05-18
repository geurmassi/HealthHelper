import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { ReferralDocument } from './documents/referral-document.entity';
import { ReferralStepHistory } from './history/referral-step-history.entity';
import { ReferralNotesController } from './notes/notes.controller';
import { ReferralNotesService } from './notes/notes.service';
import { ReferralNote } from './notes/referral-note.entity';
import { Referral } from './referral.entity';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { WorkflowService } from './workflow/workflow.service';
import { HistoryService } from './history/history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Referral,
      ReferralDocument,
      ReferralNote,
      ReferralStepHistory,
    ]),
    AuditModule,
    NotificationsModule,
    CommonModule,
    GatewayModule,
  ],
  controllers: [
    ReferralsController,
    ReferralNotesController,
    DocumentsController,
  ],
  providers: [
    ReferralsService,
    ReferralNotesService,
    WorkflowService,
    DocumentsService,
    HistoryService,
  ],
  exports: [
    ReferralsService,
    ReferralNotesService,
    WorkflowService,
    DocumentsService,
  ],
})
export class ReferralsModule {}
