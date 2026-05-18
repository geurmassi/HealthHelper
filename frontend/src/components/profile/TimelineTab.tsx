import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab';
import dayjs from 'dayjs';
import { ReferralStepHistory } from '../../types';

interface Props {
  history: ReferralStepHistory[];
}

export default function TimelineTab({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No status changes recorded yet
        </Typography>
      </Paper>
    );
  }

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Timeline position="right">
      {sorted.map((entry) => (
        <TimelineItem key={entry.id}>
          <TimelineOppositeContent
            sx={{ flex: 0.3, py: 1.5 }}
            color="text.secondary"
            variant="caption"
          >
            {dayjs(entry.changedAt).format('MMM D, YYYY')}
            <br />
            {dayjs(entry.changedAt).format('HH:mm')}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color="primary" />
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent sx={{ py: 1 }}>
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Status changed from{' '}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {entry.fromStatus}
                </Box>{' '}
                to{' '}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {entry.toStatus}
                </Box>
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {entry.changedBy?.name || 'Unknown'}
                </Typography>
                {entry.changedBy?.role && (
                  <Chip
                    size="small"
                    label={entry.changedBy.role.replace(/_/g, ' ')}
                    variant="outlined"
                  />
                )}
              </Stack>
              {entry.reason && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Reason: {entry.reason}
                </Typography>
              )}
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
