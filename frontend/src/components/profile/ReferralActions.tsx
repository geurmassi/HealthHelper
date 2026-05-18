import React, { useState } from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';
import api from '../../api/axios';
import { Referral } from '../../types';
import ReassignSpecialistDialog from '../ReassignSpecialistDialog';

const STEP_ORDER = [
  'intake',
  'clinical_prep',
  'authorization',
  'ready_to_submit',
  'submitted',
  'scheduling',
  'closed',
];

const getPreviousStep = (currentStatus: string): string | null => {
  const index = STEP_ORDER.indexOf(currentStatus);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
};

const formatStepName = (step: string): string => {
  return step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

interface Props {
  availableTransitions: string[];
  currentStatus: string;
  busy: boolean;
  disabled: boolean;
  onTransition: (event: 'NEXT_SUBSTEP' | 'PREVIOUS_SUBSTEP' | 'COMPLETE_STEP' | 'BACK_TO_STEP', targetStep?: string) => void;
  referral: Referral;
  onReassigned: (message: string) => void;
  onReassignError: (message: string) => void;
}

export default function ReferralActions({
  availableTransitions,
  currentStatus,
  busy,
  disabled,
  onTransition,
  referral,
  onReassigned,
  onReassignError,
}: Props) {
  const can = (event: string) => availableTransitions.includes(event);
  const previousStep = getPreviousStep(currentStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reassignBusy, setReassignBusy] = useState(false);

  const handleConfirm = async (specialistId: string) => {
    setReassignBusy(true);
    try {
      await api.patch(`/referrals/${referral.id}`, { specialistId });
      onReassigned('Specialist reassigned');
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      onReassignError(
        Array.isArray(msg) ? msg.join(', ') : msg || err.message || 'Reassign failed',
      );
    } finally {
      setReassignBusy(false);
    }
  };

  const reassignLabel = referral.specialist
    ? `Reassign Specialist (${referral.specialist.name})`
    : 'Assign Specialist';

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button
        variant="outlined"
        disabled={disabled || busy || !can('PREVIOUS_SUBSTEP')}
        onClick={() => onTransition('PREVIOUS_SUBSTEP')}
      >
        Previous
      </Button>
      <Button
        variant="outlined"
        disabled={disabled || busy || !can('NEXT_SUBSTEP')}
        onClick={() => onTransition('NEXT_SUBSTEP')}
      >
        Next Substep
      </Button>
      <Button
        variant="contained"
        disabled={disabled || busy || !can('COMPLETE_STEP')}
        onClick={() => onTransition('COMPLETE_STEP')}
        endIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
      >
        Complete Step
      </Button>
      {previousStep && (
        <Button
          variant="contained"
          color="warning"
          disabled={disabled || busy || !can('BACK_TO_STEP')}
          onClick={() => onTransition('BACK_TO_STEP', previousStep)}
          endIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Back to {formatStepName(previousStep)}
        </Button>
      )}
      <Button
        variant="outlined"
        color="secondary"
        disabled={disabled || busy || reassignBusy}
        onClick={() => setDialogOpen(true)}
      >
        {reassignLabel}
      </Button>

      <ReassignSpecialistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        title="Reassign Specialist"
        initialSpecialistId={referral.specialist?.id ?? null}
        busy={reassignBusy}
      />
    </Stack>
  );
}
