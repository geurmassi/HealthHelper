import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import api from '../../api/axios';
import { ReferralNote } from '../../types';

interface Props {
  referralId: string;
  notes: ReferralNote[];
  onChanged: () => void;
}

export default function NotesTab({ referralId, notes, onChanged }: Props) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...notes].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/referrals/${referralId}/notes`, { content: trimmed });
      setContent('');
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1.5}>
        {sorted.length === 0 && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notes yet
            </Typography>
          </Paper>
        )}
        {sorted.map((note) => (
          <Paper key={note.id} sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {note.user?.name || 'Unknown'}
                </Typography>
                {note.user?.role && (
                  <Chip
                    label={note.user.role.replace(/_/g, ' ')}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {dayjs(note.createdAt).format('MMM D, YYYY HH:mm')}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {note.content}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Add a note
        </Typography>
        <TextField
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={3}
          fullWidth
          placeholder="Write a clinical note..."
          disabled={submitting}
        />
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Add Note'}
          </Button>
        </Box>
      </Paper>
    </Stack>
  );
}
