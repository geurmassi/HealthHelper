import React, { useState,useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import dayjs from 'dayjs';
import api from '../../api/axios';
import { AuthorizationStatus, Referral } from '../../types';

interface Props {
  referral: Referral;
  highlightField: string | null;
  onSaved: () => void;
}

const AUTH_STATUS_OPTIONS = [
  AuthorizationStatus.NOT_REQUIRED,
  AuthorizationStatus.PENDING,
  AuthorizationStatus.APPROVED,
  AuthorizationStatus.DENIED,
  AuthorizationStatus.APPROVED_WITH_MODIFICATIONS,
];

export default function ClinicalDetailsTab({
  referral,
  highlightField,
  onSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    priority: referral.priority,
    diagnosisCode: referral.diagnosisCode ?? '',
    clinicalReason: referral.clinicalReason ?? '',
    requestedProcedure: referral.requestedProcedure ?? '',
    authorizationStatus: referral.authorizationStatus,
    authorizationNumber: referral.authorizationNumber ?? '',
    authorizationNotes: referral.authorizationNotes ?? '',
    appointmentDate: referral.appointmentDate
      ? dayjs(referral.appointmentDate).format('YYYY-MM-DDTHH:mm')
      : '',
    appointmentLocation: referral.appointmentLocation ?? '',
    specialistReport: referral.specialistReport ?? '',
  });
  useEffect(() => {
    setForm({
      priority: referral.priority,
      diagnosisCode: referral.diagnosisCode ?? '',
      clinicalReason: referral.clinicalReason ?? '',
      requestedProcedure: referral.requestedProcedure ?? '',
      authorizationStatus: referral.authorizationStatus,
      authorizationNumber: referral.authorizationNumber ?? '',
      authorizationNotes: referral.authorizationNotes ?? '',
      appointmentDate: referral.appointmentDate
          ? dayjs(referral.appointmentDate).format('YYYY-MM-DDTHH:mm')
          : '',
      appointmentLocation: referral.appointmentLocation ?? '',
      specialistReport: referral.specialistReport ?? '',
    });
  }, [referral]);
  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setForm({
      priority: referral.priority,
      diagnosisCode: referral.diagnosisCode ?? '',
      clinicalReason: referral.clinicalReason ?? '',
      requestedProcedure: referral.requestedProcedure ?? '',
      authorizationStatus: referral.authorizationStatus,
      authorizationNumber: referral.authorizationNumber ?? '',
      authorizationNotes: referral.authorizationNotes ?? '',
      appointmentDate: referral.appointmentDate
        ? dayjs(referral.appointmentDate).format('YYYY-MM-DDTHH:mm')
        : '',
      appointmentLocation: referral.appointmentLocation ?? '',
      specialistReport: referral.specialistReport ?? '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        priority: form.priority,
        diagnosisCode: form.diagnosisCode || undefined,
        clinicalReason: form.clinicalReason || undefined,
        requestedProcedure: form.requestedProcedure || undefined,
        authorizationStatus: form.authorizationStatus,
        authorizationNumber: form.authorizationNumber || undefined,
        authorizationNotes: form.authorizationNotes || undefined,
        appointmentLocation: form.appointmentLocation || undefined,
        specialistReport: form.specialistReport || undefined,
      };
      if (form.appointmentDate) {
        payload.appointmentDate = new Date(form.appointmentDate).toISOString();
      }
      console.log(form)
      const response = await api.patch(`/referrals/${referral.id}`, payload);
      setForm(response.data);
      setEditing(false);
      onSaved();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || err.message || 'Save failed'
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = (name: string) =>
    highlightField === name
      ? { '& .MuiOutlinedInput-root': { boxShadow: '0 0 0 2px #ffb300' } }
      : undefined;

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        {editing ? (
          <>
            <Button onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </>
        ) : (
          <Button variant="outlined" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Patient Info
        </Typography>
        <Grid container spacing={2}>
          <ReadField label="Name" value={`${referral.patient.firstName} ${referral.patient.lastName}`} />
          <ReadField label="Date of Birth" value={referral.patient.dateOfBirth} />
          <ReadField label="Phone" value={referral.patient.phone} />
          <ReadField label="Email" value={referral.patient.email} />
          <ReadField label="Insurance" value={`${referral.patient.insuranceProvider} (${referral.patient.insurancePlanId})`} />
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Referral Info
        </Typography>
        <Grid container spacing={2}>
          <ReadField label="Type" value={referral.referralType} />
          <ReadField label="Specialty" value={referral.specialty} />
          <Grid size={{ xs: 12, md: 6 }} id="field-priority">
            <TextField
                select
                label="Priority"
                value={form.priority}
                onChange={update('priority')}
                fullWidth
                size="small"
                disabled={!editing}
                sx={fieldSx('priority')}
            >
              <MenuItem value="routine">Routine</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="stat">Stat</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} id="field-diagnosisCode">
            <TextField
              label="Diagnosis Code"
              value={form.diagnosisCode}
              onChange={update('diagnosisCode')}
              fullWidth
              size="small"
              disabled={!editing}
              sx={fieldSx('diagnosisCode')}
            />
          </Grid>
          <Grid size={{ xs: 12 }} id="field-clinicalReason">
            <TextField
              label="Clinical Reason"
              value={form.clinicalReason}
              onChange={update('clinicalReason')}
              fullWidth
              multiline
              rows={3}
              size="small"
              disabled={!editing}
              sx={fieldSx('clinicalReason')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} id="field-requestedProcedure">
            <TextField
              label="Requested Procedure"
              value={form.requestedProcedure}
              onChange={update('requestedProcedure')}
              fullWidth
              size="small"
              disabled={!editing}
              sx={fieldSx('requestedProcedure')}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Authorization
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }} id="field-authorizationStatus">
            <TextField
              select
              label="Status"
              value={form.authorizationStatus}
              onChange={update('authorizationStatus')}
              fullWidth
              size="small"
              disabled={!editing}
            >
              {AUTH_STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} id="field-authorizationNumber">
            <TextField
              label="Authorization Number"
              value={form.authorizationNumber}
              onChange={update('authorizationNumber')}
              fullWidth
              size="small"
              disabled={!editing}
              sx={fieldSx('authorizationNumber')}
            />
          </Grid>
          <Grid size={{ xs: 12 }} id="field-authorizationNotes">
            <TextField
              label="Authorization Notes"
              value={form.authorizationNotes}
              onChange={update('authorizationNotes')}
              fullWidth
              multiline
              rows={2}
              size="small"
              disabled={!editing}
              sx={fieldSx('authorizationNotes')}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Appointment
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }} id="field-appointmentDate">
            <TextField
              label="Appointment Date"
              type="datetime-local"
              value={form.appointmentDate}
              onChange={update('appointmentDate')}
              fullWidth
              size="small"
              disabled={!editing}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx('appointmentDate')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} id="field-appointmentLocation">
            <TextField
              label="Location"
              value={form.appointmentLocation}
              onChange={update('appointmentLocation')}
              fullWidth
              size="small"
              disabled={!editing}
              sx={fieldSx('appointmentLocation')}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Specialist Report
        </Typography>
        <TextField
          id="field-specialistReport"
          value={form.specialistReport}
          onChange={update('specialistReport')}
          fullWidth
          multiline
          rows={4}
          size="small"
          placeholder="No report yet"
          disabled={!editing}
          sx={fieldSx('specialistReport')}
        />
      </Paper>
    </Stack>
  );
}

function ReadField({ label, value }: { label: string; value: string | null }) {

  return (

    <Grid size={{ xs: 12, md: 6 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value || '—'}</Typography>
      </Box>
    </Grid>
  );
}
