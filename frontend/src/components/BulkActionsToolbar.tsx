import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import api from '../api/axios';
import { Priority, Referral } from '../types';
import ReassignSpecialistDialog from './ReassignSpecialistDialog';

interface Props {
  selectedIds: string[];
  rows: Referral[];
  onDone: (message: string) => void;
  onError: (message: string) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: Priority.ROUTINE, label: 'Routine' },
  { value: Priority.URGENT, label: 'Urgent' },
  { value: Priority.STAT, label: 'Stat' },
];

export default function BulkActionsToolbar({
  selectedIds,
  rows,
  onDone,
  onError,
}: Props) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [specialistOpen, setSpecialistOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>(Priority.ROUTINE);
  const [busy, setBusy] = useState(false);

  const count = selectedIds.length;

  const patchAll = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await Promise.all(
        selectedIds.map((id) => api.patch(`/referrals/${id}`, payload)),
      );
      onDone(`Updated ${count} referrals`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      onError(
        Array.isArray(msg) ? msg.join(', ') : msg || err.message || 'Update failed',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePriorityConfirm = async () => {
    await patchAll({ priority });
    setPriorityOpen(false);
  };

  const handleSpecialistConfirm = async (specialistId: string) => {
    await patchAll({ specialistId });
    setSpecialistOpen(false);
  };

  const handleExportCsv = () => {
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    const header = [
      'Patient Name',
      'Referral Type',
      'Specialty',
      'Status',
      'Priority',
      'Created Date',
      'Specialist',
    ];
    const lines = selectedRows.map((r) => {
      const patientName = `${r.patient?.firstName ?? ''} ${r.patient?.lastName ?? ''}`.trim();
      const specialistName = r.specialist ? r.specialist.name : 'Not assigned';
      const createdAt = r.createdAt
        ? dayjs(r.createdAt).format('YYYY-MM-DD')
        : '';
      return [
        patientName,
        r.referralType ?? '',
        r.specialty ?? '',
        r.status ?? '',
        r.priority ?? '',
        createdAt,
        specialistName,
      ]
        .map(csvEscape)
        .join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDone(`Exported ${count} referrals to CSV`);
  };

  return (
    <Paper sx={{ p: 1.5, mb: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {count} referral{count === 1 ? '' : 's'} selected
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPriorityOpen(true)}
            disabled={busy}
          >
            Change Priority
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setSpecialistOpen(true)}
            disabled={busy}
          >
            Reassign Specialist
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportCsv}
            disabled={busy}
          >
            Export CSV
          </Button>
          {busy && <CircularProgress size={20} />}
        </Stack>
      </Stack>

      <Dialog
        open={priorityOpen}
        onClose={busy ? undefined : () => setPriorityOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Priority</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            disabled={busy}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriorityOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePriorityConfirm}
            disabled={busy}
            endIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <ReassignSpecialistDialog
        open={specialistOpen}
        onClose={() => setSpecialistOpen(false)}
        onConfirm={handleSpecialistConfirm}
        title="Reassign Specialist"
        busy={busy}
      />
    </Paper>
  );
}

function csvEscape(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
