import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Link as MuiLink,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api/axios';
import {
  Referral,
  ReferralDocument,
  ReferralNote,
  ReferralStepHistory,
} from '../types';
import { TransitionsInfo } from '../types/transitions';
import StatusChip from '../components/StatusChip';
import PriorityChip from '../components/PriorityChip';
import RealTimeToast from '../components/RealTimeToast';
import { useSocket } from '../hooks/useSocket';
import ReferralProgressStepper from '../components/profile/ReferralProgressStepper';
import SubstepProgress from '../components/SubstepProgress';
import ReferralActions from '../components/profile/ReferralActions';
import ClinicalDetailsTab from '../components/profile/ClinicalDetailsTab';
import DocumentsTab from '../components/profile/DocumentsTab';
import NotesTab from '../components/profile/NotesTab';
import TimelineTab from '../components/profile/TimelineTab';



type TransitionEvent = 'NEXT_SUBSTEP' | 'PREVIOUS_SUBSTEP' | 'COMPLETE_STEP'  | 'BACK_TO_STEP';

export default function ReferralProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [transitions, setTransitions] = useState<TransitionsInfo | null>(null);
  const [notes, setNotes] = useState<ReferralNote[]>([]);
  const [documents, setDocuments] = useState<ReferralDocument[]>([]);
  const [history, setHistory] = useState<ReferralStepHistory[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [highlightField, setHighlightField] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [refRes, trRes, notesRes, docsRes, histRes] = await Promise.all([
        api.get<Referral>(`/referrals/${id}`),
        api.get<TransitionsInfo>(`/referrals/${id}/transitions`),
        api.get<ReferralNote[]>(`/referrals/${id}/notes`),
        api.get<ReferralDocument[]>(`/referrals/${id}/documents`),
        api
          .get<ReferralStepHistory[]>(`/referrals/${id}/history`)
          .catch(() => ({ data: [] as ReferralStepHistory[] })),
      ]);
      setReferral(refRes.data);
      setTransitions(trRes.data);
      setNotes(notesRes.data);
      setDocuments(docsRes.data);
      setHistory(histRes.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load referral'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
     fetchAll();
  }, [fetchAll]);

  const socketEvent = useSocket();
  useEffect( () => {
    if (!socketEvent || !id) return;

    // Only react to events for THIS referral
    if (socketEvent.data.referralId !== id) return;

    if (socketEvent.name === 'referral:status-changed') {
      console.log("teeeeeeeeest")
      const refresh = async () => {
        await fetchAll();
      };
      refresh();  // refetch everything — status, transitions, etc.
    }

    /*if (socketEvent.name === 'referral:track-authorization-status') {
      fetchAll();  // refetch everything — status, transitions, etc.
    }*/
    if (socketEvent.name === 'referral:note-added') {
      refetchNotes();
    }
    if (socketEvent.name === 'referral:document-uploaded') {
      refetchDocuments();
    }
  }, [socketEvent]);
  useEffect(() => {
    if (!socketEvent || !id) return;
    const eventId = (socketEvent.data as { referralId?: string }).referralId;
    if (eventId !== id) return;
    if (socketEvent.name === 'referral:status-changed') {
      fetchAll();
    } else if (socketEvent.name === 'referral:note-added') {
      api
        .get<ReferralNote[]>(`/referrals/${id}/notes`)
        .then((res) => setNotes(res.data))
        .catch(() => {});
    } else if (socketEvent.name === 'referral:document-uploaded') {
      api
        .get<ReferralDocument[]>(`/referrals/${id}/documents`)
        .then((res) => setDocuments(res.data))
        .catch(() => {});
    }
  }, [socketEvent, id, fetchAll]);

  const refetchNotes = async () => {
    if (!id) return;
    const res = await api.get<ReferralNote[]>(`/referrals/${id}/notes`);
    setNotes(res.data);
    setSnackbar('Note added');
  };

  const refetchDocuments = async () => {
    if (!id) return;
    const res = await api.get<ReferralDocument[]>(`/referrals/${id}/documents`);
    setDocuments(res.data);
    setSnackbar('Documents updated');
  };

  const handleTransition = async (event: TransitionEvent, targetStep?: string) => {
    if (!id) return;
    setActionError(null);
    setTransitionBusy(true);
    try {
      const body: any = { event };
      if (targetStep) {
        body.targetStep = targetStep;
      }
      await api.post(`/referrals/${id}/transition`, body);
      await fetchAll();
      setSnackbar('Status updated');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setActionError(
        Array.isArray(msg) ? msg.join(', ') : msg || err.message || 'Transition failed'
      );
    } finally {
      setTransitionBusy(false);
    }
  };

  const handleMissingFieldClick = (field: string) => {
    setTab(0);
    setHighlightField(field);
    setTimeout(() => {
      const el = document.getElementById(`field-${field}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightField(null), 3000);
  };

  if (loading && !referral) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={80} />
        <Skeleton variant="rectangular" height={300} />
      </Stack>
    );
  }

  if (error || !referral || !transitions) {
    return <Alert severity="error">{error || 'Referral not found'}</Alert>;
  }

  const isClosed =
    referral.status === 'closed' && referral.currentSubstep === '7e';
  const missingFields = transitions.missingFieldsForNextStep || [];
  console.log(missingFields)
  return (
    <Box>
      {isClosed && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Referral Complete
        </Alert>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {missingFields.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          To complete this step, please fill:{' '}
          {missingFields.map((f, i) => (
            <React.Fragment key={f}>
              {i > 0 && ', '}
              <MuiLink
                component="button"
                onClick={() => handleMissingFieldClick(f)}
                sx={{ fontWeight: 600 }}
              >
                {f}
              </MuiLink>
            </React.Fragment>
          ))}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {referral.patient.firstName} {referral.patient.lastName}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
              <StatusChip status={referral.status} />
              <PriorityChip priority={referral.priority} />
              <Chip label={referral.specialty} size="small" />
              <Chip
                label={referral.referralType}
                size="small"
                variant="outlined"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Created {dayjs(referral.createdAt).format('MMM D, YYYY HH:mm')}
            </Typography>
          </Box>

          <ReferralActions
            availableTransitions={transitions.availableTransitions}
            busy={transitionBusy}
            currentStatus={transitions.currentStatus}
            disabled={isClosed}
            onTransition={handleTransition}
            referral={referral}
            onReassigned={(msg) => {
              setSnackbar(msg);
              fetchAll();
            }}
            onReassignError={(msg) => setActionError(msg)}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <ReferralProgressStepper
          currentStatus={transitions.currentStatus}
          currentSubstep={transitions.currentSubstep}
        />
      </Paper>

      <Box sx={{ mb: 2 }}>
        <SubstepProgress
          currentStatus={transitions.currentStatus}
          currentSubstep={transitions.currentSubstep}
          completedSubsteps={transitions.completedSubsteps || []}
        />
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Clinical Details" />
          <Tab label={`Documents (${documents.length})`} />
          <Tab label={`Notes (${notes.length})`} />
          <Tab label="Timeline" />
        </Tabs>
      </Paper>

      <Box>
        {tab === 0 && (
          <ClinicalDetailsTab
            referral={referral}
            highlightField={highlightField}
            onSaved={() => {
              fetchAll();
              setSnackbar('Saved');
            }}
          />
        )}
        {tab === 1 && (
          <DocumentsTab
            referralId={referral.id}
            documents={documents}
            onChanged={refetchDocuments}
          />
        )}
        {tab === 2 && (
          <NotesTab
            referralId={referral.id}
            notes={notes}
            onChanged={refetchNotes}
          />
        )}
        {tab === 3 && <TimelineTab history={history} />}
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <RealTimeToast event={socketEvent} filterReferralId={id} />
    </Box>
  );
}
