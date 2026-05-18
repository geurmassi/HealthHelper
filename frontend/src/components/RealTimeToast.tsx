import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import {
  DocumentUploadedPayload,
  NoteAddedPayload,
  SocketEvent,
  StatusChangedPayload,
} from '../hooks/useSocket';

interface Props {
  event: SocketEvent | null;
  filterReferralId?: string;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function buildMessage(event: SocketEvent): string {
  switch (event.name) {
    case 'referral:status-changed': {
      const d = event.data as StatusChangedPayload;
      return `Referral #${shortId(d.referralId)} moved to ${d.newStatus} by ${d.updatedBy}`;
    }
    case 'referral:note-added': {
      const d = event.data as NoteAddedPayload;
      return `New note on referral #${shortId(d.referralId)}`;
    }
    case 'referral:document-uploaded': {
      const d = event.data as DocumentUploadedPayload;
      const name = d.document?.fileName ? `: ${d.document.fileName}` : '';
      return `Document uploaded on referral #${shortId(d.referralId)}${name}`;
    }
    default:
      return 'Update received';
  }
}

export default function RealTimeToast({ event, filterReferralId }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!event) return;
    if (filterReferralId) {
      const eventId = (event.data as { referralId?: string }).referralId;
      if (eventId !== filterReferralId) return;
    }
    setMessage(buildMessage(event));
    setOpen(true);
  }, [event, filterReferralId]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{ minWidth: 280 }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
