import React from 'react';
import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { WORKFLOW_STEPS } from '../../types/transitions';

interface Props {
  currentStatus: string;
  currentSubstep: string;
}

export default function ReferralProgressStepper({
  currentStatus,
  currentSubstep,
}: Props) {
  const activeIndex = WORKFLOW_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeIndex} alternativeLabel>
        {WORKFLOW_STEPS.map((step) => (
          <Step key={step.key}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Current substep:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {currentSubstep || '—'}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
