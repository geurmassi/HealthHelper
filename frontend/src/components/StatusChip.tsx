import React from 'react';
import { Chip } from '@mui/material';

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  intake: { label: 'Intake', color: '#1976d2' },
  clinical_prep: { label: 'Clinical Prep', color: '#ed6c02' },
  authorization: { label: 'Authorization', color: '#7b1fa2' },
  ready_to_submit: { label: 'Ready to Submit', color: '#00897b' },
  submitted: { label: 'Submitted', color: '#3f51b5' },
  scheduling: { label: 'Scheduling', color: '#0097a7' },
  closed: { label: 'Closed', color: '#2e7d32' },
};

export default function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { label: status, color: '#757575' };
  return (
    <Chip
      label={style.label}
      size="small"
      sx={{
        bgcolor: style.color,
        color: '#fff',
        fontWeight: 500,
      }}
    />
  );
}
