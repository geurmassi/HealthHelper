import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';
import { DashboardStats } from '../types';

const STATUS_COLORS: Record<string, string> = {
  intake: '#1976d2',
  clinical_prep: '#ed6c02',
  authorization: '#7b1fa2',
  ready_to_submit: '#00897b',
  submitted: '#3f51b5',
  scheduling: '#0097a7',
  closed: '#2e7d32',
};

const SPECIALTY_COLORS: Record<string, string> = {
  cardiology: '#c62828',
  dermatology: '#ef6c00',
  orthopedics: '#1565c0',
  neurology: '#6a1b9a',
  radiology: '#00838f',
};

const AUTHORIZATION_COLORS: Record<string, string> = {
  approved: '#2e7d32',
  denied: '#d32f2f',
  pending: '#fbc02d',
  not_required: '#9e9e9e',
  approved_with_modifications: '#ed6c02',
};

const FALLBACK_COLOR = '#90a4ae';
const CHART_HEIGHT = 300;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DashboardStats>('/referrals/stats/dashboard');
      setStats(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load dashboard stats',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={fetchStats}>
            Retry
          </Button>
        }
      >
        {error || 'Failed to load dashboard'}
      </Alert>
    );
  }

  const statusData = stats.byStatus.map((d) => ({
    name: d.status,
    label: prettyLabel(d.status),
    value: d.count,
    color: STATUS_COLORS[d.status] || FALLBACK_COLOR,
  }));

  const specialtyData = stats.bySpecialty.map((d) => ({
    name: d.specialty,
    label: prettyLabel(d.specialty),
    count: d.count,
    color: SPECIALTY_COLORS[d.specialty] || FALLBACK_COLOR,
  }));

  const trendData = stats.timeToScheduleTrend.map((d) => ({
    month: d.month,
    averageDays: d.averageDays,
  }));

  const authData = stats.authorizationBreakdown.map((d) => ({
    name: d.status,
    label: prettyLabel(d.status),
    value: d.count,
    color: AUTHORIZATION_COLORS[d.status] || FALLBACK_COLOR,
  }));

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            label="Total Referrals"
            value={String(stats.summary.totalReferrals)}
            icon={<AssignmentIcon />}
            bg="#e3f2fd"
            accent="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            label="Average Completion Time"
            value={`${formatNumber(stats.summary.averageCompletionDays)} days`}
            icon={<TimerIcon />}
            bg="#e8f5e9"
            accent="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            label="Completion Rate"
            value={`${formatPercent(stats.summary.completionRate)}%`}
            icon={<CheckCircleIcon />}
            bg="#f3e5f5"
            accent="#7b1fa2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            label="Pending Authorizations"
            value={String(stats.summary.pendingAuthorizations)}
            icon={<PendingActionsIcon />}
            bg="#fff3e0"
            accent="#ed6c02"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Referrals by Status">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(d: any) => `${d.value}`}
                  onClick={(d: any) =>
                    navigate(`/referrals?status=${d.payload.name}`)
                  }
                  cursor="pointer"
                >
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Count']} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Referrals by Specialty">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={specialtyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  cursor="pointer"
                  onClick={(d: any) =>
                    navigate(`/referrals?specialty=${d.name}`)
                  }
                >
                  {specialtyData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Time to Schedule Trend">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => [`${v} days`, 'Avg']} />
                <Line
                  type="monotone"
                  dataKey="averageDays"
                  name="Avg days"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Authorization Breakdown">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={authData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(d: any) => `${d.value}`}
                >
                  {authData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Count']} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  accent: string;
}

function SummaryCard({ label, value, icon, bg, accent }: SummaryCardProps) {
  return (
    <Paper sx={{ p: 2.5, bgcolor: bg, height: '100%' }} elevation={0}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: '#fff',
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: accent }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rectangular" height={96} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={340} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={340} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function prettyLabel(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatPercent(rate: number): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '0';
  const pct = rate <= 1 ? rate * 100 : rate;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}
