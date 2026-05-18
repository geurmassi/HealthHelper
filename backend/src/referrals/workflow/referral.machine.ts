import { assign, setup } from 'xstate';
import { AuthorizationStatus, Referral } from '../referral.entity';

export type ReferralStatusValue =
  | 'intake'
  | 'clinical_prep'
  | 'authorization'
  | 'ready_to_submit'
  | 'submitted'
  | 'scheduling'
  | 'closed';

export interface ReferralMachineContext {
  referralId: string;
  completedSubsteps: string[];
}

export type ReferralMachineEvent =
  | { type: 'NEXT_SUBSTEP'; referral: Referral }
  | { type: 'PREVIOUS_SUBSTEP'; referral: Referral }
  | { type: 'COMPLETE_STEP'; referral: Referral }
  | { type: 'BACK_TO_STEP'; referral: Referral; targetStep: ReferralStatusValue };

export interface ReferralMachineInput {
  referralId: string;
}

// Intake → Clinical Prep: requires patient, referral type, specialty, priority, and a diagnosis code — the minimum identifying + clinical context to triage the case.
const intakeReady = (r: Referral): boolean =>
  !!(
    r.patient?.id &&
    r.referralType &&
    r.specialty &&
    r.priority &&
    r.diagnosisCode
  );

// Clinical Prep → Authorization: clinician must document the clinical reason before insurance review can begin.
const clinicalPrepReady = (r: Referral): boolean => !!r.clinicalReason;

// Authorization → Ready to Submit: insurance must approve, approve-with-mods, or have waived prior auth — denied or pending blocks the referral from going out.
const authorizationReady = (r: Referral): boolean =>
  r.authorizationStatus === AuthorizationStatus.APPROVED ||
  r.authorizationStatus === AuthorizationStatus.APPROVED_WITH_MODIFICATIONS ||
  r.authorizationStatus === AuthorizationStatus.NOT_REQUIRED;

// Scheduling → Closed: an appointment date must be set before the referral can move toward closure.
const schedulingReady = (r: Referral): boolean => !!r.appointmentDate;

// Closing: requires the specialist's report — the deliverable that closes the loop with the referring provider.
const closingReady = (r: Referral): boolean => !!r.specialistReport;

// Sugar over the registered `recordSubstep` action — used as exit/entry actions on each substep state. Once a substep has been visited it stays in completedSubsteps even if the user navigates backwards.
const recordSubstep = (substep: string) =>
  ({ type: 'recordSubstep', params: { substep } }) as const;

export const referralMachine = setup({
  types: {
    context: {} as ReferralMachineContext,
    events: {} as ReferralMachineEvent,
    input: {} as ReferralMachineInput,
  },
  guards: {
    canCompleteIntake: ({ event }) => {
      if (event.type !== 'COMPLETE_STEP') return false;
      return intakeReady(event.referral);
    },
    canCompleteClinicalPrep: ({ event }) => {
      if (event.type !== 'COMPLETE_STEP') return false;
      return intakeReady(event.referral) && clinicalPrepReady(event.referral);
    },
    canCompleteAuthorization: ({ event }) => {
      if (event.type !== 'COMPLETE_STEP') return false;
      return (
        intakeReady(event.referral) &&
        clinicalPrepReady(event.referral) &&
        authorizationReady(event.referral)
      );
    },
    canCompleteReadyToSubmit: ({ event }) => {
      if (event.type !== 'COMPLETE_STEP') return false;
      return (
        intakeReady(event.referral) &&
        clinicalPrepReady(event.referral) &&
        authorizationReady(event.referral)
      );
    },
    canCompleteSubmitted: ({ event }) => {
      return event.type === 'COMPLETE_STEP';
    },
    canCompleteScheduling: ({ event }) => {
      if (event.type !== 'COMPLETE_STEP') return false;
      return schedulingReady(event.referral);
    },
    canCloseReferral: ({ event }) => {
      if (event.type !== 'NEXT_SUBSTEP') return false;
      return closingReady(event.referral);
    },
    backTargetIsIntake: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'intake',
    backTargetIsClinicalPrep: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'clinical_prep',
    backTargetIsAuthorization: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'authorization',
    backTargetIsReadyToSubmit: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'ready_to_submit',
    backTargetIsSubmitted: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'submitted',
    backTargetIsScheduling: ({ event }) =>
      event.type === 'BACK_TO_STEP' && event.targetStep === 'scheduling',
  },
  actions: {
    recordSubstep: assign({
      completedSubsteps: (
        { context }: { context: ReferralMachineContext },
        params: { substep: string },
      ) =>
        context.completedSubsteps.includes(params.substep)
          ? context.completedSubsteps
          : [...context.completedSubsteps, params.substep],
    }),
  },
}).createMachine({
  id: 'referral',
  context: ({ input }) => ({
    referralId: input.referralId,
    completedSubsteps: [],
  }),
  initial: 'intake',
  states: {
    intake: {
      initial: '1a',
      states: {
        '1a': { exit: recordSubstep('1a'), on: { NEXT_SUBSTEP: '1b' } },
        '1b': { exit: recordSubstep('1b'), on: { NEXT_SUBSTEP: '1c', PREVIOUS_SUBSTEP: '1a' } },
        '1c': { exit: recordSubstep('1c'), on: { NEXT_SUBSTEP: '1d', PREVIOUS_SUBSTEP: '1b' } },
        '1d': { exit: recordSubstep('1d'), on: { NEXT_SUBSTEP: '1e', PREVIOUS_SUBSTEP: '1c' } },
        '1e': { exit: recordSubstep('1e'), on: { PREVIOUS_SUBSTEP: '1d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'clinical_prep',
          guard: 'canCompleteIntake',
        },
      },
    },
    clinical_prep: {
      initial: '2a',
      states: {
        '2a': { exit: recordSubstep('2a'), on: { NEXT_SUBSTEP: '2b' } },
        '2b': { exit: recordSubstep('2b'), on: { NEXT_SUBSTEP: '2c', PREVIOUS_SUBSTEP: '2a' } },
        '2c': { exit: recordSubstep('2c'), on: { NEXT_SUBSTEP: '2d', PREVIOUS_SUBSTEP: '2b' } },
        '2d': { exit: recordSubstep('2d'), on: { NEXT_SUBSTEP: '2e', PREVIOUS_SUBSTEP: '2c' } },
        '2e': { exit: recordSubstep('2e'), on: { PREVIOUS_SUBSTEP: '2d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'authorization',
          guard: 'canCompleteClinicalPrep',
        },
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
        ],
      },
    },
    authorization: {
      initial: '3a',
      states: {
        '3a': { exit: recordSubstep('3a'), on: { NEXT_SUBSTEP: '3b' } },
        '3b': { exit: recordSubstep('3b'), on: { NEXT_SUBSTEP: '3c', PREVIOUS_SUBSTEP: '3a' } },
        '3c': { exit: recordSubstep('3c'), on: { NEXT_SUBSTEP: '3d', PREVIOUS_SUBSTEP: '3b' } },
        '3d': { exit: recordSubstep('3d'), on: { NEXT_SUBSTEP: '3e', PREVIOUS_SUBSTEP: '3c' } },
        '3e': { exit: recordSubstep('3e'), on: { PREVIOUS_SUBSTEP: '3d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'ready_to_submit',
          guard: 'canCompleteAuthorization',
        },
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
          { target: 'clinical_prep.2a', guard: 'backTargetIsClinicalPrep' },
        ],
      },
    },
    ready_to_submit: {
      initial: '4a',
      states: {
        '4a': { exit: recordSubstep('4a'), on: { NEXT_SUBSTEP: '4b' } },
        '4b': { exit: recordSubstep('4b'), on: { NEXT_SUBSTEP: '4c', PREVIOUS_SUBSTEP: '4a' } },
        '4c': { exit: recordSubstep('4c'), on: { NEXT_SUBSTEP: '4d', PREVIOUS_SUBSTEP: '4b' } },
        '4d': { exit: recordSubstep('4d'), on: { NEXT_SUBSTEP: '4e', PREVIOUS_SUBSTEP: '4c' } },
        '4e': { exit: recordSubstep('4e'), on: { PREVIOUS_SUBSTEP: '4d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'submitted',
          guard: 'canCompleteReadyToSubmit',
        },
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
          { target: 'clinical_prep.2a', guard: 'backTargetIsClinicalPrep' },
          { target: 'authorization.3a', guard: 'backTargetIsAuthorization' },
        ],
      },
    },
    submitted: {
      initial: '5a',
      states: {
        '5a': { exit: recordSubstep('5a'), on: { NEXT_SUBSTEP: '5b' } },
        '5b': { exit: recordSubstep('5b'), on: { NEXT_SUBSTEP: '5c', PREVIOUS_SUBSTEP: '5a' } },
        '5c': { exit: recordSubstep('5c'), on: { NEXT_SUBSTEP: '5d', PREVIOUS_SUBSTEP: '5b' } },
        '5d': { exit: recordSubstep('5d'), on: { NEXT_SUBSTEP: '5e', PREVIOUS_SUBSTEP: '5c' } },
        '5e': { exit: recordSubstep('5e'), on: { PREVIOUS_SUBSTEP: '5d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'scheduling',
          guard: 'canCompleteSubmitted',
        },
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
          { target: 'clinical_prep.2a', guard: 'backTargetIsClinicalPrep' },
          { target: 'authorization.3a', guard: 'backTargetIsAuthorization' },
          { target: 'ready_to_submit.4a', guard: 'backTargetIsReadyToSubmit' },
        ],
      },
    },
    scheduling: {
      initial: '6a',
      states: {
        '6a': { exit: recordSubstep('6a'), on: { NEXT_SUBSTEP: '6b' } },
        '6b': { exit: recordSubstep('6b'), on: { NEXT_SUBSTEP: '6c', PREVIOUS_SUBSTEP: '6a' } },
        '6c': { exit: recordSubstep('6c'), on: { NEXT_SUBSTEP: '6d', PREVIOUS_SUBSTEP: '6b' } },
        '6d': { exit: recordSubstep('6d'), on: { NEXT_SUBSTEP: '6e', PREVIOUS_SUBSTEP: '6c' } },
        '6e': { exit: recordSubstep('6e'), on: { PREVIOUS_SUBSTEP: '6d' } },
      },
      on: {
        COMPLETE_STEP: {
          target: 'closed',
          guard: 'canCompleteScheduling',
        },
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
          { target: 'clinical_prep.2a', guard: 'backTargetIsClinicalPrep' },
          { target: 'authorization.3a', guard: 'backTargetIsAuthorization' },
          { target: 'ready_to_submit.4a', guard: 'backTargetIsReadyToSubmit' },
          { target: 'submitted.5a', guard: 'backTargetIsSubmitted' },
        ],
      },
    },
    closed: {
      initial: '7a',
      states: {
        '7a': { exit: recordSubstep('7a'), on: { NEXT_SUBSTEP: '7b' } },
        '7b': { exit: recordSubstep('7b'), on: { NEXT_SUBSTEP: '7c', PREVIOUS_SUBSTEP: '7a' } },
        '7c': { exit: recordSubstep('7c'), on: { NEXT_SUBSTEP: '7d', PREVIOUS_SUBSTEP: '7b' } },
        '7d': {
          exit: recordSubstep('7d'),
          on: {
            NEXT_SUBSTEP: { target: '7e', guard: 'canCloseReferral' },
            PREVIOUS_SUBSTEP: '7c',
          },
        },
        '7e': { entry: recordSubstep('7e'), type: 'final' },
      },
      on: {
        BACK_TO_STEP: [
          { target: 'intake.1a', guard: 'backTargetIsIntake' },
          { target: 'clinical_prep.2a', guard: 'backTargetIsClinicalPrep' },
          { target: 'authorization.3a', guard: 'backTargetIsAuthorization' },
          { target: 'ready_to_submit.4a', guard: 'backTargetIsReadyToSubmit' },
          { target: 'submitted.5a', guard: 'backTargetIsSubmitted' },
          { target: 'scheduling.6a', guard: 'backTargetIsScheduling' },
        ],
      },
    },
  },
});

export const REQUIRED_FIELDS_BY_STATUS: Record<ReferralStatusValue, string[]> =
  {
    intake: [
      'patientId',
      'referralType',
      'specialty',
      'priority',
      'diagnosisCode',
    ],
    clinical_prep: ['clinicalReason'],
    authorization: ['authorizationStatus'],
    ready_to_submit: [],
    submitted: [],
    scheduling: ['appointmentDate'],
    closed: ['specialistReport'],
  };

export function missingFieldsForCompletion(
  status: ReferralStatusValue,
  referral: Referral,
): string[] {
  const missing: string[] = [];
  switch (status) {
    case 'intake':
      if (!referral.patient?.id) missing.push('patientId');
      if (!referral.referralType) missing.push('referralType');
      if (!referral.specialty) missing.push('specialty');
      if (!referral.priority) missing.push('priority');
      if (!referral.diagnosisCode) missing.push('diagnosisCode');
      return missing;
    case 'clinical_prep':
      if (!referral.clinicalReason) missing.push('clinicalReason');
      return missing;
    case 'authorization':
      if (!authorizationReady(referral)) missing.push('authorizationStatus');
      return missing;
    case 'ready_to_submit':
      return missing;
    case 'submitted':
      return missing;
    case 'scheduling':
      if (!referral.appointmentDate) missing.push('appointmentDate');
      return missing;
    case 'closed':
      if (!referral.specialistReport) missing.push('specialistReport');
      return missing;
    default:
      return missing;
  }
}
