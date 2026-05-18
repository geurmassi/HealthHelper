import React from 'react';
import { Chip } from '@mui/material';

const PRIORITY_STYLES: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  urgent: { label: 'Urgent', bg: '#e53935', color: '#fff' },
  stat: { label: 'STAT', bg: '#b71c1c', color: '#fff' },
  routine: { label: 'Routine', bg: '#2e7d32', color: '#fff' },
};

export default function PriorityChip({ priority }: { priority: string }) {
  const style =
    PRIORITY_STYLES[priority] ||
    { label: priority, bg: '#757575', color: '#fff' };
  return (
    <Chip
      label={style.label}
      size="small"
      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }}
    />
  );
}
