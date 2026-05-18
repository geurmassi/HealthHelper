import {
  AuthorizationStatus,
  Referral,
  ReferralPriority,
  ReferralStatus,
  ReferralType,
  Specialty,
} from '../referral.entity';
import { WorkflowService } from './workflow.service';

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const referral = new Referral();
  referral.id = 'ref-1';
  referral.patient = { id: 'pat-1' } as any;
  referral.referralType = ReferralType.SPECIALTY;
  referral.specialty = Specialty.CARDIOLOGY;
  referral.priority = ReferralPriority.ROUTINE;
  referral.status = ReferralStatus.INTAKE;
  referral.currentSubstep = '1a';
  referral.diagnosisCode = null;
  referral.clinicalReason = null;
  referral.requestedProcedure = null;
  referral.authorizationStatus = AuthorizationStatus.NOT_REQUIRED;
  referral.authorizationNumber = null;
  referral.authorizationNotes = null;
  referral.appointmentDate = null;
  referral.appointmentLocation = null;
  referral.specialistReport = null;
  referral.completedAt = null;
  Object.assign(referral, overrides);
  return referral;
}

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(() => {
    service = new WorkflowService();
  });

  it('initializes machine in intake.1a', () => {
    const snapshot = service.initializeMachine('ref-1');
    expect(service.getCurrentStatus(snapshot)).toEqual({
      status: 'intake',
      substep: '1a',
    });
  });

  it('moves through substeps via NEXT_SUBSTEP', () => {
    const referral = makeReferral();
    let snapshot = service.initializeMachine(referral.id);
    const result = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    );
    expect(result.ok).toBe(true);
    expect(result.substep).toBe('1b');
    expect(result.status).toBe('intake');
    expect(result.statusChanged).toBe(false);
  });

  it('blocks COMPLETE_STEP from intake when diagnosisCode is missing', () => {
    const referral = makeReferral({ diagnosisCode: null });
    const snapshot = service.initializeMachine(referral.id);
    const result = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/diagnosisCode/);
  });

  it('completes intake -> clinical_prep when all fields are set', () => {
    const referral = makeReferral({ diagnosisCode: 'I10' });
    const snapshot = service.initializeMachine(referral.id);
    const result = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe('clinical_prep');
    expect(result.substep).toBe('2a');
    expect(result.statusChanged).toBe(true);
  });

  it('tracks completed substeps as user advances through substeps', () => {
    const referral = makeReferral();
    let snapshot = service.initializeMachine(referral.id);

    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;

    expect(service.getCurrentStatus(snapshot)).toEqual({
      status: 'intake',
      substep: '1c',
    });
    expect(service.getCompletedSubsteps(snapshot)).toEqual(['1a', '1b']);
  });

  it('does not duplicate completed substeps when moving back and forward', () => {
    const referral = makeReferral();
    let snapshot = service.initializeMachine(referral.id);

    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'PREVIOUS_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;

    expect(service.getCompletedSubsteps(snapshot)).toEqual(['1a', '1b']);
  });

  it('records the last substep when COMPLETE_STEP changes status', () => {
    const referral = makeReferral({ diagnosisCode: 'I10' });
    let snapshot = service.initializeMachine(referral.id);

    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;

    expect(service.getCurrentStatus(snapshot)).toEqual({
      status: 'clinical_prep',
      substep: '2a',
    });
    expect(service.getCompletedSubsteps(snapshot)).toEqual(['1a', '1b']);
  });

  it('BACK_TO_STEP only allows previous states', () => {
    const referral = makeReferral({ diagnosisCode: 'I10' });
    let snapshot = service.initializeMachine(referral.id);
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    const back = service.transition(
      snapshot,
      { type: 'BACK_TO_STEP', referral, targetStep: 'intake' },
      referral,
    );
    expect(back.ok).toBe(true);
    expect(back.status).toBe('intake');
    expect(back.substep).toBe('1a');

    let snapshot2 = service.initializeMachine(referral.id);
    const forward = service.transition(
      snapshot2,
      { type: 'BACK_TO_STEP', referral, targetStep: 'clinical_prep' },
      referral,
    );
    expect(forward.ok).toBe(false);
  });

  it('reaches final 7e only when specialistReport is set', () => {
    const referralBase = {
      diagnosisCode: 'I10',
      clinicalReason: 'chest pain',
      authorizationStatus: AuthorizationStatus.APPROVED,
      appointmentDate: new Date('2026-06-01'),
    };
    let referral = makeReferral(referralBase);
    let snapshot = service.initializeMachine(referral.id);

    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'COMPLETE_STEP', referral },
      referral,
    ).snapshot;

    expect(service.getCurrentStatus(snapshot)).toEqual({
      status: 'closed',
      substep: '7a',
    });

    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;
    snapshot = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    ).snapshot;

    const blocked = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/specialistReport/);

    referral = makeReferral({ ...referralBase, specialistReport: 'OK' });
    const closed = service.transition(
      snapshot,
      { type: 'NEXT_SUBSTEP', referral },
      referral,
    );
    expect(closed.ok).toBe(true);
    expect(closed.substep).toBe('7e');
    expect(closed.reachedFinal).toBe(true);
  });
});
