import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ReferralGateway } from '../gateway/referral.gateway';
import {
  AuthorizationStatus,
  Referral,
  ReferralStatus,
} from '../referrals/referral.entity';
import { REFERRAL_NOTIFICATIONS_QUEUE } from './constants';
import {
  AppointmentJobData,
  ReferralNotificationPayload,
  StatusChangeJobData,
} from './notifications.service';

// Consumer for the referral-notifications queue — dispatches each job to its handler by name.
// TODO (production): swap console.log handlers for real channels (SES/SendGrid email, Twilio SMS) and replace the random-result insurance simulation in handleTrackAuthorization with a real X12 278 / vendor REST call.
const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 100,
};

@Processor(REFERRAL_NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectQueue(REFERRAL_NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly referralGateway: ReferralGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const ts = new Date().toISOString();
    try {
      switch (job.name) {
        case 'status-change-notification':
          this.handleStatusChange(ts, job.data as StatusChangeJobData);
          break;
        case 'notify-patient-submitted':
          this.handlePatientSubmitted(
            ts,
            job.data as ReferralNotificationPayload,
          );
          break;
        case 'notify-provider-submitted':
          this.handleProviderSubmitted(
            ts,
            job.data as ReferralNotificationPayload,
          );
          break;
        case 'follow-up-no-scheduling':
        case 'follow-up-urgent':
          await this.handleFollowUp(
            ts,
            job.name,
            job.data as ReferralNotificationPayload,
          );
          break;
        case 'track-authorization-status':
          await this.handleTrackAuthorization(
            ts,
            job.data as ReferralNotificationPayload,
          );
          break;
        case 'appointment-reminder':
          this.handleAppointmentReminder(ts, job.data as AppointmentJobData);
          break;
        case 'notify-patient-appointment':
          this.handlePatientAppointment(ts, job.data as AppointmentJobData);
          break;
        case 'notify-provider-report-ready':
          this.handleProviderReportReady(
            ts,
            job.data as ReferralNotificationPayload,
          );
          break;
        default:
          this.logger.warn(`[${ts}] Unknown job name: ${job.name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[${ts}] Job ${job.name} (${job.id}) failed: ${message} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1})`,
      );
      throw err;
    }
  }

  private handleStatusChange(ts: string, data: StatusChangeJobData): void {
    const newStatus = data.toStatus ?? data.status;
    this.logger.log(
      `[${ts}] [EMAIL] To: ${data.providerEmail} | Subject: Referral #${data.referralId} moved to ${newStatus}`,
    );
  }

  private handlePatientSubmitted(
    ts: string,
    data: ReferralNotificationPayload,
  ): void {
    this.logger.log(
      `[${ts}] [SMS] To: ${data.patientPhone} | Your referral to ${data.specialty} has been submitted. You will receive appointment details soon.`,
    );
    this.logger.log(
      `[${ts}] [EMAIL] To: ${data.patientEmail} | Subject: Referral Submitted | Body: Dear ${data.patientName}, your referral to ${data.specialty} has been submitted by ${data.providerName}...`,
    );
  }

  private handleProviderSubmitted(
    ts: string,
    data: ReferralNotificationPayload,
  ): void {
    this.logger.log(
      `[${ts}] [EMAIL] To: ${data.providerEmail} | Subject: Referral Submitted | Body: Referral for ${data.patientName} to ${data.specialty} has been sent to the specialist.`,
    );
  }

  private async handleFollowUp(
    ts: string,
    jobName: 'follow-up-no-scheduling' | 'follow-up-urgent',
    data: ReferralNotificationPayload,
  ): Promise<void> {
    // Re-read from DB — payload is days old by the time this fires; status may have moved on.
    const referral = await this.referralRepo.findOne({
      where: { id: data.referralId },
    });
    if (!referral) {
      this.logger.warn(
        `[${ts}] [INFO] Referral #${data.referralId} not found - skipping follow-up.`,
      );
      return;
    }
    if (referral.status === ReferralStatus.SUBMITTED) {
      if (jobName === 'follow-up-urgent') {
        this.logger.warn(
          `[${ts}] [URGENT ALERT] Referral #${referral.id} stuck for 7 days!`,
        );
      } else {
        this.logger.warn(
          `[${ts}] [ALERT] Referral #${referral.id} has been in submitted status for 3 days with no appointment scheduled.`,
        );
      }
    } else {
      this.logger.log(
        `[${ts}] [INFO] Referral #${referral.id} already progressed. No follow-up needed.`,
      );
    }
  }

  private async handleTrackAuthorization(
    ts: string,
    data: ReferralNotificationPayload,
  ): Promise<void> {
    // Weighted simulation roughly mirroring real-world ratios: 60% approved / 20% denied / 20% modified.
    const r = Math.random();
    let result: AuthorizationStatus;
    if (r < 0.6) {
      result = AuthorizationStatus.APPROVED;
    } else if (r < 0.8) {
      result = AuthorizationStatus.DENIED;
    } else {
      result = AuthorizationStatus.APPROVED_WITH_MODIFICATIONS;
    }

    const referral = await this.referralRepo.findOne({
      where: { id: data.referralId },
    });
    if (!referral) {
      this.logger.warn(
        `[${ts}] Referral #${data.referralId} not found - skipping authorization tracking.`,
      );
      return;
    }

    referral.authorizationStatus = result;
    if (result === AuthorizationStatus.APPROVED) {
      const num = Math.floor(100000 + Math.random() * 900000);
      referral.authorizationNumber = `AUTH-2024-${num}`;
    } else if (result === AuthorizationStatus.DENIED) {
      referral.authorizationNotes =
        'Denied: insufficient clinical documentation';
    } else {
      referral.authorizationNotes = 'Approved for 3 visits within 90 days';
    }
    await this.referralRepo.save(referral);

    this.referralGateway.emitReferralUpdate('referral:status-changed', {
      referralId: referral.id,
      oldStatus: 'authorization',
      newStatus: `authorization:${result}`,
      updatedBy: 'System (Insurance)',
    });

    this.logger.log(
      `[${ts}] [INSURANCE] Referral #${referral.id} authorization result: ${result}`,
    );

    const followup: StatusChangeJobData = {
      ...data,
      fromStatus: 'authorization',
      toStatus: `authorization:${result}`,
    };
    await this.queue.add(
      'status-change-notification',
      followup,
      DEFAULT_JOB_OPTS,
    );
  }

  private handleAppointmentReminder(
    ts: string,
    data: AppointmentJobData,
  ): void {
    this.logger.log(
      `[${ts}] [SMS] To: ${data.patientPhone} | Reminder: Your ${data.specialty} appointment is tomorrow at ${data.appointmentDate}. Location: ${data.appointmentLocation}. Please arrive 15 minutes early.`,
    );
  }

  private handlePatientAppointment(
    ts: string,
    data: AppointmentJobData,
  ): void {
    this.logger.log(
      `[${ts}] [EMAIL] To: ${data.patientEmail} | Subject: Appointment Scheduled | Your ${data.specialty} appointment is on ${data.appointmentDate} at ${data.appointmentLocation}.`,
    );
  }

  private handleProviderReportReady(
    ts: string,
    data: ReferralNotificationPayload,
  ): void {
    this.logger.log(
      `[${ts}] [EMAIL] To: ${data.providerEmail} | Subject: Specialist Report Ready | The specialist report for ${data.patientName} is now available. Please review.`,
    );
  }
}
