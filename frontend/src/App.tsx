import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ReferralsListPage from './pages/ReferralsListPage';
import ReferralProfilePage from './pages/ReferralProfilePage';
import NewReferralPage from './pages/NewReferralPage';
import DashboardPage from './pages/DashboardPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f6fa' },
  },
  shape: { borderRadius: 8 },
});

const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: 24 }}>
    <h2>{title}</h2>
    <p>Coming soon.</p>
  </div>
);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={<Navigate to="/referrals" replace />}
            />
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReferralsListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewReferralPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReferralProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/referrals" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
