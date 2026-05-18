  import React, { useCallback, useEffect, useMemo, useState } from 'react';
  import {
    Alert,
    Box,
    InputAdornment,
    MenuItem,
    Paper,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Typography,
  } from '@mui/material';
  import SearchIcon from '@mui/icons-material/Search';
  import {
    DataGrid,
    GridColDef,
    GridPaginationModel,
    GridRowSelectionModel,
    GridSortModel,
  } from '@mui/x-data-grid';
  import dayjs from 'dayjs';
  import { useNavigate, useSearchParams } from 'react-router-dom';
  import api from '../api/axios';
  import StatusChip from '../components/StatusChip';
  import PriorityChip from '../components/PriorityChip';
  import RealTimeToast from '../components/RealTimeToast';
  import BulkActionsToolbar from '../components/BulkActionsToolbar';
  import { useSocket } from '../hooks/useSocket';
  import {
    PaginatedReferrals,
    Priority,
    Referral,
    ReferralStatus,
    Specialty,
  } from '../types';
  
  const STATUS_OPTIONS: { value: '' | ReferralStatus; label: string }[] = [
    { value: '', label: 'All' },
    { value: ReferralStatus.INTAKE, label: 'Intake' },
    { value: ReferralStatus.CLINICAL_PREP, label: 'Clinical Prep' },
    { value: ReferralStatus.AUTHORIZATION, label: 'Authorization' },
    { value: ReferralStatus.READY_TO_SUBMIT, label: 'Ready to Submit' },
    { value: ReferralStatus.SUBMITTED, label: 'Submitted' },
    { value: ReferralStatus.SCHEDULING, label: 'Scheduling' },
    { value: ReferralStatus.CLOSED, label: 'Closed' },
  ];
  
  const PRIORITY_OPTIONS: { value: '' | Priority; label: string }[] = [
    { value: '', label: 'All' },
    { value: Priority.URGENT, label: 'Urgent' },
    { value: Priority.ROUTINE, label: 'Routine' },
    { value: Priority.STAT, label: 'Stat' },
  ];
  
  const SPECIALTY_OPTIONS: { value: '' | Specialty; label: string }[] = [
    { value: '', label: 'All' },
    { value: Specialty.CARDIOLOGY, label: 'Cardiology' },
    { value: Specialty.DERMATOLOGY, label: 'Dermatology' },
    { value: Specialty.ORTHOPEDICS, label: 'Orthopedics' },
    { value: Specialty.NEUROLOGY, label: 'Neurology' },
    { value: Specialty.RADIOLOGY, label: 'Radiology' },
  ];
  
  export default function ReferralsListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
  
    const initialStatus = parseEnumParam(
      searchParams.get('status'),
      Object.values(ReferralStatus) as string[],
    ) as ReferralStatus | '';
    const initialPriority = parseEnumParam(
      searchParams.get('priority'),
      Object.values(Priority) as string[],
    ) as Priority | '';
    const initialSpecialty = parseEnumParam(
      searchParams.get('specialty'),
      Object.values(Specialty) as string[],
    ) as Specialty | '';
    const initialSearch = searchParams.get('search') ?? '';
    const initialFromDate = searchParams.get('fromDate') ?? '';
    const initialToDate = searchParams.get('toDate') ?? '';

    const [status, setStatus] = useState<'' | ReferralStatus>(initialStatus);
    const [priority, setPriority] = useState<'' | Priority>(initialPriority);
    const [specialty, setSpecialty] = useState<'' | Specialty>(initialSpecialty);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(initialToDate);

    useEffect(() => {
      const next = new URLSearchParams();
      if (status) next.set('status', status);
      if (priority) next.set('priority', priority);
      if (specialty) next.set('specialty', specialty);
      if (search) next.set('search', search);
      if (fromDate) next.set('fromDate', fromDate);
      if (toDate) next.set('toDate', toDate);
      setSearchParams(next, { replace: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, priority, specialty, search, fromDate, toDate]);
  
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
      page: 0,
      pageSize: 10,
    });
    const [sortModel, setSortModel] = useState<GridSortModel>([
      { field: 'createdAt', sort: 'desc' },
    ]);
  
    const [rows, setRows] = useState<Referral[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [snackbar, setSnackbar] = useState<string | null>(null);
  
    // Debounce search input -> 350ms.
    useEffect(() => {
      const t = setTimeout(() => setSearch(searchInput.trim()), 350);
      return () => clearTimeout(t);
    }, [searchInput]);
  
    const fetchReferrals = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const sort = sortModel[0];
        const params: Record<string, string | number> = {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
          sortBy: sort?.field ?? 'createdAt',
          sortOrder: sort?.sort === 'asc' ? 'ASC' : 'DESC',
        };
        if (status) params.status = status;
        if (priority) params.priority = priority;
        if (specialty) params.specialty = specialty;
        if (search) params.search = search;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const { data } = await api.get<PaginatedReferrals>('/referrals', {
          params,
        });
        setRows(data.data);
        setTotal(data.total);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load referrals'
        );
      } finally {
        setLoading(false);
      }
    }, [
      status,
      priority,
      specialty,
      search,
      fromDate,
      toDate,
      paginationModel.page,
      paginationModel.pageSize,
      sortModel,
    ]);
  
    useEffect(() => {
      fetchReferrals();
    }, [fetchReferrals]);
  
    const socketEvent = useSocket();
  
    useEffect(() => {
      if (socketEvent?.name === 'referral:status-changed') {
        fetchReferrals();
      }
    }, [socketEvent, fetchReferrals]);
  
    const columns: GridColDef<Referral>[] = useMemo(
      () => [
        {
          field: 'patientName',
          headerName: 'Patient Name',
          flex: 1.2,
          minWidth: 180,
          sortable: false,
          valueGetter: (_value, row) =>
            `${row.patient?.firstName ?? ''} ${row.patient?.lastName ?? ''}`.trim(),
        },
        {
          field: 'referralType',
          headerName: 'Referral Type',
          flex: 1,
          minWidth: 130,
          sortable: false,
          valueGetter: (_value, row) =>
            row.referralType ? capitalize(row.referralType) : '',
        },
        {
          field: 'specialty',
          headerName: 'Specialty',
          flex: 1,
          minWidth: 140,
          renderCell: (p) =>
            p.row.specialty ? (
              <SpecialtyChip specialty={p.row.specialty} />
            ) : null,
        },
        {
          field: 'status',
          headerName: 'Status',
          flex: 1,
          minWidth: 150,
          renderCell: (p) => <StatusChip status={p.row.status} />,
        },
        {
          field: 'priority',
          headerName: 'Priority',
          flex: 0.8,
          minWidth: 110,
          renderCell: (p) => <PriorityChip priority={p.row.priority} />,
        },
        {
          field: 'createdAt',
          headerName: 'Date Created',
          flex: 1,
          minWidth: 140,
          valueFormatter: (value) =>
            value ? dayjs(value as string).format('MMM D, YYYY') : '',
        },
        {
          field: 'specialist',
          headerName: 'Specialist',
          flex: 1,
          minWidth: 160,
          sortable: false,
          valueGetter: (_value, row) =>
            row.specialist ? row.specialist.name : 'Not assigned',
        },
      ],
      []
    );
  
    return (
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Referrals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading...' : `${total} total`}
          </Typography>
        </Stack>
  
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'center' }}
          >
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as '' | ReferralStatus);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ minWidth: 170 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value || 'all'} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
  
            <TextField
              select
              label="Priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as '' | Priority);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <MenuItem key={o.value || 'all'} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
  
            <TextField
              select
              label="Specialty"
              value={specialty}
              onChange={(e) => {
                setSpecialty(e.target.value as '' | Specialty);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ minWidth: 130 }}
            >
              {SPECIALTY_OPTIONS.map((o) => (
                <MenuItem key={o.value || 'all'} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
  
            <TextField
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Search"
              placeholder="Search patients or diagnosis..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              size="small"
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Paper>

        {selected.length > 0 && (
          <BulkActionsToolbar
            selectedIds={selected}
            rows={rows}
            onDone={(msg) => {
              setSnackbar(msg);
              setSelected([]);
              fetchReferrals();
            }}
            onError={(msg) => setError(msg)}
          />
        )}
  
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
  
        {loading && rows.length === 0 ? (
          <Paper sx={{ p: 2 }}>
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={36} />
              ))}
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              paginationMode="server"
              sortingMode="server"
              rowCount={total}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              pageSizeOptions={[10]}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selected}
              onRowSelectionModelChange={(model: GridRowSelectionModel) =>
                setSelected(model.map((id) => String(id)))
              }
              onRowClick={(params) => navigate(`/referrals/${params.id}`)}
              sx={{
                border: 0,
                '& .MuiDataGrid-row': { cursor: 'pointer' },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f5f6fa',
                  fontWeight: 600,
                },
              }}
            />
          </Paper>
        )}
  
        <RealTimeToast event={socketEvent} />

        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          message={snackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    );
  }
  
  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  
  function parseEnumParam(value: string | null, valid: string[]): string {
    if (!value) return '';
    return valid.includes(value) ? value : '';
  }
  
  const SPECIALTY_COLORS: Record<string, string> = {
    cardiology: '#c62828',
    dermatology: '#ef6c00',
    orthopedics: '#1565c0',
    neurology: '#6a1b9a',
    radiology: '#00838f',
  };

  function SpecialtyChip({ specialty }: { specialty: string }) {
    const color = SPECIALTY_COLORS[specialty] || '#757575';
    return (
        <Box
            component="span"
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.2,
              borderRadius: 888,
              fontSize: 15,
              fontWeight: 700,
              color,
              border: `1px solid ${color}`,
              bgcolor: `${color}14`,
              lineHeight: 1.4,
            }}
        >
          {capitalize(specialty)}
        </Box>
    );
  }
