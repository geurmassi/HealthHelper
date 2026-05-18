import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { SUBSTEP_LABELS, WORKFLOW_STEPS } from '../types/transitions';

interface Props {
  currentStatus: string;
  currentSubstep: string;
  completedSubsteps: string[];
}

export default function SubstepProgress({
  currentStatus,
  currentSubstep,
  completedSubsteps,
}: Props) {
  const step = WORKFLOW_STEPS.find((s) => s.key === currentStatus);
  if (!step) return null;

  const substepKeys = ['a', 'b', 'c', 'd', 'e'].map((s) => `${step.prefix}${s}`);
  const completedSet = new Set(completedSubsteps);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        {step.label} substeps
      </Typography>
      <List dense disablePadding>
        {substepKeys.map((key) => {
          const isCurrent = key === currentSubstep;
          const isDone = completedSet.has(key) && !isCurrent;
          const label = SUBSTEP_LABELS[key] ?? key;

          return (
            <ListItem
              key={key}
              sx={{
                bgcolor: isCurrent ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                borderRadius: 1,
                mb: 0.25,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {isDone ? (
                  <CheckCircleIcon sx={{ color: '#2e7d32' }} fontSize="small" />
                ) : isCurrent ? (
                  <RadioButtonCheckedIcon
                    sx={{ color: '#1976d2' }}
                    fontSize="small"
                  />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ color: '#bdbdbd' }}
                    fontSize="small"
                  />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    component="span"
                    sx={{
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent
                        ? 'text.primary'
                        : isDone
                        ? 'text.primary'
                        : 'text.disabled',
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ fontFamily: 'monospace', mr: 1 }}
                    >
                      {key}
                    </Box>
                    {label}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
