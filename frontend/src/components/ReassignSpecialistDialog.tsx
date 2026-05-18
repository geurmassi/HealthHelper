import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import api from '../api/axios';
import { User, UserRole } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (specialistId: string) => Promise<void> | void;
  title?: string;
  initialSpecialistId?: string | null;
  busy?: boolean;
}

export default function ReassignSpecialistDialog({
  open,
  onClose,
  onConfirm,
  title = 'Reassign Specialist',
  initialSpecialistId = null,
  busy = false,
}: Props) {
  const [specialists, setSpecialists] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId(initialSpecialistId ?? '');
    setLoading(true);
    api
      .get<User[]>('/users')
      .then((res) => {
        setSpecialists(
          res.data.filter((u) => u.role === UserRole.SPECIALIST_STAFF),
        );
      })
      .catch((err: any) =>
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load specialists',
        ),
      )
      .finally(() => setLoading(false));
  }, [open, initialSpecialistId]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    try {
      await onConfirm(selectedId);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Reassign failed',
      );
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Specialist"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            fullWidth
            size="small"
            disabled={loading || busy}
          >
            {specialists.length === 0 && !loading && (
              <MenuItem value="" disabled>
                No specialists available
              </MenuItem>
            )}
            {specialists.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedId || busy || loading}
          endIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
