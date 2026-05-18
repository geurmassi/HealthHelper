import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { useDropzone } from 'react-dropzone';
import dayjs from 'dayjs';
import api from '../../api/axios';
import { ReferralDocument } from '../../types';

interface Props {
  referralId: string;
  documents: ReferralDocument[];
  onChanged: () => void;
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export default function DocumentsTab({
  referralId,
  documents,
  onChanged,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    multiple: false,
    onDrop: (files) => {
      setError(null);
      if (files[0]) setPendingFile(files[0]);
    },
  });

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      await api.post(`/referrals/${referralId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setPendingFile(null);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/referrals/${referralId}/documents/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const downloadUrl = (docId: string) =>
    `${api.defaults.baseURL}/referrals/${referralId}/documents/${docId}/download`;

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed #bbb',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            bgcolor: isDragActive ? '#e3f2fd' : '#fafafa',
            cursor: 'pointer',
          }}
        >
          <input {...getInputProps()} />
          <Typography variant="body2" color="text.secondary">
            Drag & drop a file here, or click to select. Accepts PDF, PNG, JPG.
          </Typography>
        </Box>

        {pendingFile && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {pendingFile.name} ({Math.round(pendingFile.size / 1024)} KB)
            </Typography>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? `${progress}%` : 'Upload'}
            </Button>
            <Button onClick={() => setPendingFile(null)} disabled={uploading}>
              Remove
            </Button>
          </Stack>
        )}
        {uploading && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1 }}
          />
        )}
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                  >
                    No documents uploaded yet
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>{doc.fileType}</TableCell>
                <TableCell>{doc.uploadedBy?.name || '—'}</TableCell>
                <TableCell>
                  {dayjs(doc.uploadedAt).format('MMM D, YYYY HH:mm')}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    component="a"
                    href={downloadUrl(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setConfirmDeleteId(doc.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={!!confirmDeleteId}
        onClose={() => !deleting && setConfirmDeleteId(null)}
      >
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
