import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { Referral } from '../referrals/referral.entity';
import { User } from '../users/user.entity';
import { REFERRAL_NOTIFICATIONS_QUEUE } from './constants';

// Producer — enqueues every referral notification job onto BullMQ.
const DAY_MS = 24 * 60 * 60 * 1000;
const delay = 20_000;
const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 100,
};

export interface ReferralNotificationPayload {
  referralId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  providerName: string;
  providerEmail: string;
  specialty: string;
  status: string;
}

export interface StatusChangeJobData extends ReferralNotificationPayload {
  fromStatus: string;
  toStatus: string;
  changedById?: string;
  changedByName?: string;
}

export interface AppointmentJobData extends ReferralNotificationPayload {
  appointmentDate: string | null;
  appointmentLocation: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(REFERRAL_NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  private buildBasePayload(referral: Referral): ReferralNotificationPayload {
    const patient = referral.patient;
    const provider = referral.referringProvider;
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : 'Unknown Patient';
    return {
      referralId: referral.id,
      patientName,
      patientEmail: patient?.email ?? '',
      patientPhone: patient?.phone ?? '',
      providerName: provider?.name ?? 'Unknown Provider',
      providerEmail: provider?.email ?? '',
      specialty: referral.specialty,
      status: referral.status,
    };
  }

  // Job: status-change-notification — triggered on every workflow status change. Async so email delivery never blocks the HTTP transition response.
  async onStatusChange(
    referral: Referral,
    fromStatus: string,
    toStatus: string,
    changedBy: User | null | undefined,
  ): Promise<void> {
    const data: StatusChangeJobData = {
      ...this.buildBasePayload(referral),
      fromStatus,
      toStatus,
      changedById: changedBy?.id,
      changedByName: changedBy?.name,
    };
    await this.queue.add('status-change-notification', data, DEFAULT_JOB_OPTS);
    this.logger.debug(
      `Enqueued status-change-notification for referral ${referral.id} (${fromStatus} -> ${toStatus})`,
    );
  }

  // Jobs (4): notify-patient-submitted + notify-provider-submitted (instant), follow-up-no-scheduling (3-day delay) + follow-up-urgent (7-day delay) — fanned out when a referral enters "submitted". Async because the follow-ups must wait days before checking for stalls.
  async onReferralSubmitted(referral: Referral): Promise<void> {
    const base = this.buildBasePayload(referral);
    await Promise.all([
      this.queue.add('notify-patient-submitted', base, DEFAULT_JOB_OPTS),
      this.queue.add('notify-provider-submitted', base, DEFAULT_JOB_OPTS),
      this.queue.add('follow-up-no-scheduling', base, {
        ...DEFAULT_JOB_OPTS,
        delay: 3 * DAY_MS,
      }),
      this.queue.add('follow-up-urgent', base, {
        ...DEFAULT_JOB_OPTS,
        delay: 7 * DAY_MS,
      }),
    ]);
    this.logger.debug(
      `Enqueued submitted-related jobs for referral ${referral.id}`,
    );
  }

  // Job: track-authorization-status — triggered when a referral enters "authorization", scheduled with a 30s–2min random delay to mimic insurance API latency. Async because real insurance decisions are minutes-to-hours and must not block the request.
  async onAuthorizationSubmitted(referral: Referral): Promise<void> {
    const base = this.buildBasePayload(referral);
    //const delay = Math.floor(Math.random() * (120_000 - 30_000 + 1)) + 30_000
    await this.queue.add('track-authorization-status', base, {
      ...DEFAULT_JOB_OPTS,
      delay,
    });
    this.logger.debug(
      `Enqueued track-authorization-status for referral ${referral.id} in ${delay}ms`,
    );
  }

  // Jobs (2): notify-patient-appointment (instant) + appointment-reminder (delayed to ~24h before the appointment). Triggered when appointmentDate first becomes non-null. Async for the day-before reminder.
  async onAppointmentScheduled(referral: Referral): Promise<void> {
    const base = this.buildBasePayload(referral);
    const data: AppointmentJobData = {
      ...base,
      appointmentDate: referral.appointmentDate
        ? referral.appointmentDate.toISOString()
        : null,
      appointmentLocation: referral.appointmentLocation,
    };
    // Clamp at 0 so appointments less than 24h away fire the reminder immediately instead of negative-delay erroring.
    const reminderDelay = referral.appointmentDate
      ? Math.max(referral.appointmentDate.getTime() - DAY_MS - Date.now(), 0)
      : 0;
    await Promise.all([
      this.queue.add('appointment-reminder', data, {
        ...DEFAULT_JOB_OPTS,
        delay: reminderDelay,
      }),
      this.queue.add('notify-patient-appointment', data, DEFAULT_JOB_OPTS),
    ]);
    this.logger.debug(
      `Enqueued appointment jobs for referral ${referral.id} (reminder in ${reminderDelay}ms)`,
    );
  }

  // Job: notify-provider-report-ready — triggered when a referral closes, telling the original provider the specialist's report is in. Async to keep close-out latency low.
  async onReferralClosed(referral: Referral): Promise<void> {
    const base = this.buildBasePayload(referral);
    await this.queue.add(
      'notify-provider-report-ready',
      base,
      DEFAULT_JOB_OPTS,
    );
    this.logger.debug(
      `Enqueued notify-provider-report-ready for referral ${referral.id}`,
    );
  }
}
