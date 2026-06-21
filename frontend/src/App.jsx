import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Predictions from './pages/Predictions';
import { alertsApi } from './services/api';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    alertsApi.getStats().then((r) => {
      setAlertCount(r.data?.unresolved || 0);
    }).catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<Home />} />

          {/* Auth page — login / sign up */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected application portal */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app-layout">
                  <Sidebar alertCount={alertCount} />
                  <div className="main-content">
                    <Routes>
                      <Route path="/dashboard"   element={<Dashboard   alertCount={alertCount} setAlertCount={setAlertCount} />} />
                      <Route path="/events"       element={<Events       alertCount={alertCount} />} />
                      <Route path="/events/:id"   element={<EventDetail  alertCount={alertCount} />} />
                      <Route path="/alerts"       element={<Alerts       alertCount={alertCount} setAlertCount={setAlertCount} />} />
                      <Route path="/analytics"    element={<Analytics    alertCount={alertCount} />} />
                      <Route path="/predictions"  element={<Predictions  alertCount={alertCount} />} />
                      {/* Fallback inside panel */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
