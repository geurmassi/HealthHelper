import { Injectable } from '@nestjs/common';
import { createActor } from 'xstate';
import { Referral } from '../referral.entity';
import {
  REQUIRED_FIELDS_BY_STATUS,
  ReferralMachineEvent,
  ReferralStatusValue,
  missingFieldsForCompletion,
  referralMachine,
} from './referral.machine';

export type PersistedSnapshot = Record<string, unknown>;

interface SnapshotShape {
  value?: unknown;
  context?: { completedSubsteps?: string[]; referralId?: string };
  status?: string;
}

export interface CurrentStatus {
  status: ReferralStatusValue;
  substep: string;
}

export interface TransitionResult {
  ok: boolean;
  reason?: string;
  snapshot: PersistedSnapshot;
  status: ReferralStatusValue;
  substep: string;
  statusChanged: boolean;
  reachedFinal: boolean;
}

const ALL_STATUSES: ReferralStatusValue[] = [
  'intake',
  'clinical_prep',
  'authorization',
  'ready_to_submit',
  'submitted',
  'scheduling',
  'closed',
];

@Injectable()
export class WorkflowService {
  initializeMachine(referralId: string): PersistedSnapshot {
    const actor = createActor(referralMachine, { input: { referralId } });
    actor.start();
    const snapshot = actor.getPersistedSnapshot();
    actor.stop();
    return JSON.parse(JSON.stringify(snapshot)) as PersistedSnapshot;
  }

  getCurrentStatus(snapshot: PersistedSnapshot): CurrentStatus {
    const value = (snapshot as SnapshotShape).value;
    if (typeof value === 'string') {
      return { status: value as ReferralStatusValue, substep: '' };
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 0) {
        const [status, substep] = entries[0];
        return {
          status: status as ReferralStatusValue,
          substep: typeof substep === 'string' ? substep : '',
        };
      }
    }
    return { status: 'intake', substep: '1a' };
  }

  getCompletedSubsteps(snapshot: PersistedSnapshot): string[] {
    const ctx = (snapshot as SnapshotShape).context;
    return ctx?.completedSubsteps ?? [];
  }

  canTransition(
    currentSnapshot: PersistedSnapshot,
    event: ReferralMachineEvent,
  ): boolean {
    const actor = createActor(
      referralMachine,
      { snapshot: currentSnapshot } as never,
    );
    actor.start();
    const can = actor.getSnapshot().can(event);
    actor.stop();
    return can;
  }

  transition(
    currentSnapshot: PersistedSnapshot,
    event: ReferralMachineEvent,
    referral: Referral,
  ): TransitionResult {
    const before = this.getCurrentStatus(currentSnapshot);

    const actor = createActor(
      referralMachine,
      { snapshot: currentSnapshot } as never,
    );
    actor.start();
    const liveSnapshot = actor.getSnapshot();

    if (!liveSnapshot.can(event)) {
      actor.stop();
      const reason = this.explainBlocked(before, event, referral);
      return {
        ok: false,
        reason,
        snapshot: currentSnapshot,
        status: before.status,
        substep: before.substep,
        statusChanged: false,
        reachedFinal: false,
      };
    }

    actor.send(event);
    const newPersisted = actor.getPersistedSnapshot() as SnapshotShape;
    const serialized = JSON.parse(
      JSON.stringify(newPersisted),
    ) as PersistedSnapshot;
    const newStatus = this.getCurrentStatus(serialized);

    const reachedFinal =
      newPersisted.status === 'done' ||
      (newStatus.status === 'closed' && newStatus.substep === '7e');
    actor.stop();

    return {
      ok: true,
      snapshot: serialized,
      status: newStatus.status,
      substep: newStatus.substep,
      statusChanged: newStatus.status !== before.status,
      reachedFinal,
    };
  }

  getAvailableTransitions(
    snapshot: PersistedSnapshot,
    referral: Referral,
  ): string[] {
    const actor = createActor(
      referralMachine,
      { snapshot } as never,
    );
    actor.start();
    const live = actor.getSnapshot();
    const events: string[] = [];

    if (live.can({ type: 'NEXT_SUBSTEP', referral })) {
      events.push('NEXT_SUBSTEP');
    }
    if (live.can({ type: 'PREVIOUS_SUBSTEP', referral })) {
      events.push('PREVIOUS_SUBSTEP');
    }
    if (live.can({ type: 'COMPLETE_STEP', referral })) {
      events.push('COMPLETE_STEP');
    }
    for (const target of ALL_STATUSES) {
      if (live.can({ type: 'BACK_TO_STEP', referral, targetStep: target })) {
        events.push('BACK_TO_STEP');
        break;
      }
    }

    actor.stop();
    return events;
  }

  missingFieldsForNextStep(
    snapshot: PersistedSnapshot,
    referral: Referral,
  ): string[] {
    const { status } = this.getCurrentStatus(snapshot);
    return missingFieldsForCompletion(status, referral);
  }

  requiredFieldsForStatus(status: ReferralStatusValue): string[] {
    return REQUIRED_FIELDS_BY_STATUS[status] ?? [];
  }

  private explainBlocked(
    current: CurrentStatus,
    event: ReferralMachineEvent,
    referral: Referral,
  ): string {
    if (event.type === 'COMPLETE_STEP') {
      const missing = missingFieldsForCompletion(current.status, referral);
      const nextStatus = this.nextStatusFor(current.status);
      if (missing.length > 0) {
        return `Cannot move to ${nextStatus ?? 'next state'}: missing ${missing.join(
          ', ',
        )}`;
      }
      return `Cannot complete step from ${current.status}.${current.substep}`;
    }
    if (event.type === 'NEXT_SUBSTEP') {
      if (current.status === 'closed' && current.substep === '7d') {
        return 'Cannot move to 7e: missing specialistReport';
      }
      return `No NEXT_SUBSTEP from ${current.status}.${current.substep}`;
    }
    if (event.type === 'PREVIOUS_SUBSTEP') {
      return `No PREVIOUS_SUBSTEP from ${current.status}.${current.substep}`;
    }
    if (event.type === 'BACK_TO_STEP') {
      return `Cannot go back to ${event.targetStep} from ${current.status}: target must be a previous state`;
    }
    return 'Transition not allowed in current state';
  }

  private nextStatusFor(
    status: ReferralStatusValue,
  ): ReferralStatusValue | null {
    const idx = ALL_STATUSES.indexOf(status);
    if (idx < 0 || idx >= ALL_STATUSES.length - 1) return null;
    return ALL_STATUSES[idx + 1];
  }
}
