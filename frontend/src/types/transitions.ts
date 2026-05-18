export interface TransitionsInfo {
  currentStatus: string;
  currentSubstep: string;
  availableTransitions: string[];
  missingFieldsForNextStep: string[];
  completedSubsteps: string[];
}

export const WORKFLOW_STEPS: { key: string; label: string; prefix: string }[] = [
  { key: 'intake', label: 'Intake', prefix: '1' },
  { key: 'clinical_prep', label: 'Clinical Prep', prefix: '2' },
  { key: 'authorization', label: 'Authorization', prefix: '3' },
  { key: 'ready_to_submit', label: 'Ready to Submit', prefix: '4' },
  { key: 'submitted', label: 'Submitted', prefix: '5' },
  { key: 'scheduling', label: 'Scheduling', prefix: '6' },
  { key: 'closed', label: 'Closed', prefix: '7' },
];

export const SUBSTEP_LABELS: Record<string, string> = {
  '1a': 'Select patient & referral type',
  '1b': 'Collect clinical information',
  '1c': 'Attach clinical documents',
  '1d': 'Set priority & timeline',
  '1e': 'Auto-assign specialty',
  '2a': 'Quality check',
  '2b': 'Identify missing information',
  '2c': 'Request additional records',
  '2d': 'Clinical verification',
  '2e': 'Prepare specialist-specific forms',
  '3a': 'Determine authorization requirement',
  '3b': 'Submit authorization request',
  '3c': 'Track authorization status',
  '3d': 'Handle denials/modifications',
  '3e': 'Obtain patient authorization',
  '4a': 'Final documentation review',
  '4b': 'Verify specialist availability',
  '4c': 'System compliance check',
  '4d': 'Calculate cost estimate',
  '4e': 'Approval from quality/compliance team',
  '5a': 'Send to specialist',
  '5b': 'Record submission details',
  '5c': 'Notify patient',
  '5d': 'Notify referring provider',
  '5e': 'Set follow-up timer',
  '6a': 'Monitor for appointment scheduled',
  '6b': 'Auto-follow up if delayed',
  '6c': 'Update referral with appointment details',
  '6d': 'Send appointment reminder to patient',
  '6e': 'Link to digital check-in',
  '7a': 'Receive specialist report',
  '7b': 'Parse and integrate results',
  '7c': 'Notify referring provider',
  '7d': 'Document outcomes',
  '7e': 'Close referral',
};
