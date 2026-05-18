import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormHelperText,
  Grid,
  IconButton,
  LinearProgress,
  Link as MuiLink,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone, FileRejection } from 'react-dropzone';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Patient,
  Priority,
  Referral,
  ReferralType,
  Specialty,
} from '../types';

type FieldErrors = Partial<Record<
  | 'patientId'
  | 'referralType'
  | 'specialty'
  | 'priority'
  | 'diagnosisCode'
  | 'clinicalReason'
  | 'requestedProcedure'
  | 'documents',
  string
>>;

interface FormState {
  patient: Patient | null;
  referralType: ReferralType | '';
  specialty: Specialty | '';
  priority: Priority;
  diagnosisCode: string;
  clinicalReason: string;
  requestedProcedure: string;
  documents: File[];
}

const INITIAL_STATE: FormState = {
  patient: null,
  referralType: '',
  specialty: '',
  priority: Priority.ROUTINE,
  diagnosisCode: '',
  clinicalReason: '',
  requestedProcedure: '',
  documents: [],
};

const STEPS = ['Patient & Type', 'Clinical Info', 'Review & Submit'];

const REFERRAL_TYPE_OPTIONS: { value: ReferralType; label: string }[] = [
  { value: ReferralType.SPECIALTY, label: 'Specialty' },
  { value: ReferralType.DIAGNOSTIC, label: 'Diagnostic' },
  { value: ReferralType.PROCEDURE, label: 'Procedure' },
];

const SPECIALTY_OPTIONS: { value: Specialty; label: string }[] = [
  { value: Specialty.CARDIOLOGY, label: 'Cardiology' },
  { value: Specialty.DERMATOLOGY, label: 'Dermatology' },
  { value: Specialty.ORTHOPEDICS, label: 'Orthopedics' },
  { value: Specialty.NEUROLOGY, label: 'Neurology' },
  { value: Specialty.RADIOLOGY, label: 'Radiology' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.ROUTINE]: '#2e7d32',
  [Priority.URGENT]: '#ed6c02',
  [Priority.STAT]: '#d32f2f',
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export default function NewReferralPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const [leaveDialog, setLeaveDialog] = useState<null | (() => void)>(null);
  const submittedRef = useRef(false);

  const isDirty = useMemo(() => {
    return (
      form.patient !== null ||
      form.referralType !== '' ||
      form.specialty !== '' ||
      form.priority !== Priority.ROUTINE ||
      form.diagnosisCode.trim() !== '' ||
      form.clinicalReason.trim() !== '' ||
      form.requestedProcedure.trim() !== '' ||
      form.documents.length > 0
    );
  }, [form]);

  // Warn on browser navigation (close/refresh) when there's unsaved data.
  useEffect(() => {
    if (!isDirty || submittedRef.current) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const clearError = (key: keyof FieldErrors) => {
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validateStep1 = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!form.patient) e.patientId = 'Please select a patient from the search';
    if (!form.referralType) e.referralType = 'Referral type is required';
    if (!form.specialty) e.specialty = 'Specialty is required';
    if (!form.priority) e.priority = 'Priority is required';
    return e;
  };

  const validateStep2 = (): FieldErrors => {
    const e: FieldErrors = {};
    const code = form.diagnosisCode.trim();
    const reason = form.clinicalReason.trim();
    if (code && code.length < 3) {
      e.diagnosisCode = 'Diagnosis code must be at least 3 characters';
    }
    if (reason && reason.length < 10) {
      e.clinicalReason = 'Clinical reason must be at least 10 characters';
    }
    return e;
  };

  const handleNext = () => {
    const stepErrors = activeStep === 0 ? validateStep1() : validateStep2();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setActiveStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const goToStep = (step: number) => {
    setErrors({});
    setActiveStep(step);
  };

  const handleSubmit = async () => {
    const stepErrors = { ...validateStep1(), ...validateStep2() };
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstStep1Key = ['patientId', 'referralType', 'specialty', 'priority'].some(
        (k) => k in stepErrors,
      );
      setActiveStep(firstStep1Key ? 0 : 1);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setUploadStatus('Creating referral...');
    try {
      const payload: Record<string, string> = {
        patientId: form.patient!.id,
        referralType: form.referralType as ReferralType,
        specialty: form.specialty as Specialty,
        priority: form.priority,
      };
      const code = form.diagnosisCode.trim();
      if (code) payload.diagnosisCode = code;
      const reason = form.clinicalReason.trim();
      if (reason) payload.clinicalReason = reason;
      const procedure = form.requestedProcedure.trim();
      if (procedure) payload.requestedProcedure = procedure;

      const { data: referral } = await api.post<Referral>('/referrals', payload);

      const total = form.documents.length;
      for (let i = 0; i < total; i++) {
        setUploadStatus(`Uploading documents (${i + 1}/${total})...`);
        const fd = new FormData();
        fd.append('file', form.documents[i]);
        await api.post(`/referrals/${referral.id}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      submittedRef.current = true;
      setForm(INITIAL_STATE);
      setSuccessOpen(true);
      setUploadStatus(null);
      navigate(`/referrals/${referral.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(', ')
        : msg || err.message || 'Failed to create referral';
      setSubmitError(text);

      // Surface DTO validation errors inline when possible.
      if (Array.isArray(msg)) {
        const next: FieldErrors = {};
        for (const m of msg as string[]) {
          const lower = m.toLowerCase();
          if (lower.includes('patientid')) next.patientId = m;
          else if (lower.includes('referraltype')) next.referralType = m;
          else if (lower.includes('specialty')) next.specialty = m;
          else if (lower.includes('priority')) next.priority = m;
          else if (lower.includes('diagnosiscode')) next.diagnosisCode = m;
          else if (lower.includes('clinicalreason')) next.clinicalReason = m;
          else if (lower.includes('requestedprocedure')) next.requestedProcedure = m;
        }
        if (Object.keys(next).length > 0) {
          setErrors((e) => ({ ...e, ...next }));
          const firstStep1Key = [
            'patientId',
            'referralType',
            'specialty',
            'priority',
          ].some((k) => k in next);
          setActiveStep(firstStep1Key ? 0 : 1);
        }
      }
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          New Referral
        </Typography>
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {submitError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => setSubmitError(null)}
          >
            {submitError}
          </Alert>
        )}

        {activeStep === 0 && (
          <Step1
            form={form}
            errors={errors}
            setField={setField}
            clearError={clearError}
          />
        )}
        {activeStep === 1 && (
          <Step2
            form={form}
            errors={errors}
            setField={setField}
            clearError={clearError}
          />
        )}
        {activeStep === 2 && <Step3 form={form} onEdit={goToStep} />}

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
        >
          <Button
            onClick={() => {
              if (isDirty) setLeaveDialog(() => () => navigate('/referrals'));
              else navigate('/referrals');
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Stack direction="row" spacing={2}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || submitting}
            >
              Back
            </Button>
            {activeStep < STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={
                  submitting ? <CircularProgress size={16} color="inherit" /> : null
                }
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </Stack>
        </Stack>

        {submitting && uploadStatus && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {uploadStatus}
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </Paper>

      <Dialog open={!!leaveDialog} onClose={() => setLeaveDialog(null)}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to leave this page?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialog(null)}>Keep editing</Button>
          <Button
            color="error"
            onClick={() => {
              const action = leaveDialog;
              setLeaveDialog(null);
              if (action) action();
            }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        message="Referral created"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

interface StepProps {
  form: FormState;
  errors: FieldErrors;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  clearError: (key: keyof FieldErrors) => void;
}

function Step1({ form, errors, setField, clearError }: StepProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (debouncedSearch) params.search = debouncedSearch;
        const { data } = await api.get<Patient[]>('/patients', { params });
        if (!cancelled) setOptions(data);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  return (
    <Stack spacing={3}>
      <Box>
        <Autocomplete<Patient>
          options={options}
          value={form.patient}
          loading={loading}
          getOptionLabel={(p) =>
            `${p.firstName} ${p.lastName} — ${dayjs(p.dateOfBirth).format(
              'MMM D, YYYY',
            )} — ${p.insuranceProvider}`
          }
          isOptionEqualToValue={(o, v) => o.id === v.id}
          filterOptions={(x) => x}
          onInputChange={(_, value, reason) => {
            if (reason === 'input') setSearch(value);
          }}
          onChange={(_, value) => {
            setField('patient', value);
            clearError('patientId');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Patient *"
              placeholder="Search by name..."
              error={!!errors.patientId}
              helperText={
                errors.patientId ||
                'Type to search patients by first or last name'
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Box>

      <TextField
        select
        label="Referral Type *"
        value={form.referralType}
        onChange={(e) => {
          setField('referralType', e.target.value as ReferralType);
          clearError('referralType');
        }}
        error={!!errors.referralType}
        helperText={errors.referralType || ' '}
        fullWidth
      >
        {REFERRAL_TYPE_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Specialty *"
        value={form.specialty}
        onChange={(e) => {
          setField('specialty', e.target.value as Specialty);
          clearError('specialty');
        }}
        error={!!errors.specialty}
        helperText={errors.specialty || ' '}
        fullWidth
      >
        {SPECIALTY_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Priority *
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={form.priority}
          onChange={(_, value: Priority | null) => {
            if (value) {
              setField('priority', value);
              clearError('priority');
            }
          }}
          aria-label="priority"
        >
          {([Priority.ROUTINE, Priority.URGENT, Priority.STAT] as Priority[]).map(
            (p) => (
              <ToggleButton
                key={p}
                value={p}
                sx={{
                  textTransform: 'capitalize',
                  px: 3,
                  '&.Mui-selected': {
                    bgcolor: `${PRIORITY_COLORS[p]}22`,
                    color: PRIORITY_COLORS[p],
                    borderColor: PRIORITY_COLORS[p],
                    fontWeight: 600,
                    '&:hover': { bgcolor: `${PRIORITY_COLORS[p]}33` },
                  },
                }}
              >
                {p}
              </ToggleButton>
            ),
          )}
        </ToggleButtonGroup>
        {errors.priority && (
          <FormHelperText error sx={{ mt: 0.5 }}>
            {errors.priority}
          </FormHelperText>
        )}
      </Box>
    </Stack>
  );
}

function Step2({ form, errors, setField, clearError }: StepProps) {
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDrop: (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const first = rejected[0];
        const code = first.errors[0]?.code;
        const msg =
          code === 'file-too-large'
            ? `File "${first.file.name}" exceeds the 10MB limit`
            : code === 'file-invalid-type'
              ? `File "${first.file.name}" has an unsupported type`
              : first.errors[0]?.message || 'File rejected';
        setDropzoneError(msg);
        return;
      }
      const remaining = MAX_FILES - form.documents.length;
      if (remaining <= 0) {
        setDropzoneError(`You can upload a maximum of ${MAX_FILES} files`);
        return;
      }
      const next = [...form.documents, ...accepted.slice(0, remaining)];
      setField('documents', next);
      clearError('documents');
      setDropzoneError(
        accepted.length > remaining
          ? `Only the first ${remaining} files were added (max ${MAX_FILES})`
          : null,
      );
    },
  });

  const removeFile = (idx: number) => {
    const next = form.documents.filter((_, i) => i !== idx);
    setField('documents', next);
    setDropzoneError(null);
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Diagnosis Code (ICD-10)"
        value={form.diagnosisCode}
        onChange={(e) => {
          setField('diagnosisCode', e.target.value);
          clearError('diagnosisCode');
        }}
        error={!!errors.diagnosisCode}
        helperText={
          errors.diagnosisCode ||
          'Optional — can be added later during the intake step'
        }
        fullWidth
      />

      <TextField
        label="Clinical Reason"
        value={form.clinicalReason}
        onChange={(e) => {
          setField('clinicalReason', e.target.value);
          clearError('clinicalReason');
        }}
        error={!!errors.clinicalReason}
        helperText={
          errors.clinicalReason ||
          'Optional — can be added later during the intake step'
        }
        placeholder="Describe why this patient needs a specialist referral..."
        multiline
        rows={4}
        fullWidth
      />

      <TextField
        label="Requested Procedure"
        value={form.requestedProcedure}
        onChange={(e) => {
          setField('requestedProcedure', e.target.value);
          clearError('requestedProcedure');
        }}
        error={!!errors.requestedProcedure}
        helperText={errors.requestedProcedure || 'Optional'}
        placeholder="e.g., Stress test and echocardiogram"
        fullWidth
      />

      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Documents
        </Typography>
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : '#bbb',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: isDragActive ? '#e3f2fd' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Drag & drop files here, or click to select
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            PDF, PNG, JPG, JPEG · max {MAX_FILES} files · 10MB each
          </Typography>
        </Box>

        {dropzoneError && (
          <FormHelperText error sx={{ mt: 1 }}>
            {dropzoneError}
          </FormHelperText>
        )}

        {form.documents.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {form.documents.map((file, idx) => (
              <Paper
                key={`${file.name}-${idx}`}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(file.size)}
                </Typography>
                <IconButton size="small" onClick={() => removeFile(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function Step3({
  form,
  onEdit,
}: {
  form: FormState;
  onEdit: (step: number) => void;
}) {
  return (
    <Stack spacing={3}>
      <Alert severity="info">
        <AlertTitle>Review your referral</AlertTitle>
        Confirm the details below, then submit to create the referral.
      </Alert>

      <ReviewSection title="Patient" onEdit={() => onEdit(0)}>
        {form.patient ? (
          <Grid container spacing={1}>
            <ReviewRow label="Name">
              {form.patient.firstName} {form.patient.lastName}
            </ReviewRow>
            <ReviewRow label="Date of birth">
              {dayjs(form.patient.dateOfBirth).format('MMM D, YYYY')}
            </ReviewRow>
            <ReviewRow label="Insurance">
              {form.patient.insuranceProvider} ({form.patient.insurancePlanId})
            </ReviewRow>
          </Grid>
        ) : (
          <Typography variant="body2" color="error">
            No patient selected
          </Typography>
        )}
      </ReviewSection>

      <ReviewSection title="Referral" onEdit={() => onEdit(0)}>
        <Grid container spacing={1}>
          <ReviewRow label="Type">{capitalize(form.referralType)}</ReviewRow>
          <ReviewRow label="Specialty">{capitalize(form.specialty)}</ReviewRow>
          <ReviewRow label="Priority">
            <Box
              component="span"
              sx={{
                px: 1.2,
                py: 0.3,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: PRIORITY_COLORS[form.priority],
                border: `1px solid ${PRIORITY_COLORS[form.priority]}`,
                bgcolor: `${PRIORITY_COLORS[form.priority]}14`,
                textTransform: 'capitalize',
              }}
            >
              {form.priority}
            </Box>
          </ReviewRow>
        </Grid>
      </ReviewSection>

      <ReviewSection title="Clinical Information" onEdit={() => onEdit(1)}>
        <Grid container spacing={1}>
          <ReviewRow label="Diagnosis code">
            {form.diagnosisCode || '— (can be added later)'}
          </ReviewRow>
          <ReviewRow label="Clinical reason">
            {form.clinicalReason || '— (can be added later)'}
          </ReviewRow>
          <ReviewRow label="Requested procedure">
            {form.requestedProcedure || '—'}
          </ReviewRow>
        </Grid>
      </ReviewSection>

      <ReviewSection title="Documents" onEdit={() => onEdit(1)}>
        <Typography variant="body2">
          {form.documents.length === 0
            ? 'No documents will be uploaded'
            : `${form.documents.length} file${form.documents.length === 1 ? '' : 's'} will be uploaded after the referral is created`}
        </Typography>
      </ReviewSection>
    </Stack>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <MuiLink component="button" onClick={onEdit} sx={{ fontSize: 14 }}>
          Edit
        </MuiLink>
      </Stack>
      {children}
    </Paper>
  );
}

function ReviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Grid item xs={12} sm={4}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={8}>
        <Typography variant="body2">{children}</Typography>
      </Grid>
    </>
  );
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
