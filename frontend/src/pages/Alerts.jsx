import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, Clock, MapPin, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import { alertsApi } from '../services/api';
import socket from '../services/socket';

const SEVERITY_ICONS = { critical: AlertTriangle, warning: AlertTriangle, info: Info };
const TYPE_LABELS = {
  high_congestion: 'High Congestion', event_started: 'Event Alert', event_ended: 'Event Ended',
  route_blocked: 'Route Blocked', manpower_alert: 'Manpower', unplanned_gathering: 'Unplanned',
  accident: 'Accident', system: 'System',
};

export default function Alerts({ alertCount, setAlertCount }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { severity: filter } : {};
      const res = await alertsApi.getAll(params);
      setAlerts(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  useEffect(() => {
    socket.on('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      setAlertCount?.((n) => n + 1);
    });
    socket.on('alert_resolved', ({ id }) => {
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, resolved: true } : a));
    });
    return () => { socket.off('new_alert'); socket.off('alert_resolved'); };
  }, []);

  const handleResolve = async (id) => {
    await alertsApi.resolve(id, { resolvedBy: 'Traffic Officer' });
    setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, resolved: true } : a));
    setAlertCount?.((n) => Math.max(0, n - 1));
  };

  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="page-enter">
      <Topbar title="Alerts & Incidents" subtitle="Real-time traffic and event alerts" alertCount={alertCount} />
      <div className="page-content">

        {/* Stats */}
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Alerts', value: alerts.length, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
            { label: 'Unresolved', value: unresolvedCount, color: '#f97316', bg: 'rgba(249,115,22,0.1)', up: true },
            { label: 'Critical', value: alerts.filter(a => a.severity === 'critical' && !a.resolved).length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', up: true },
            { label: 'Resolved', value: alerts.filter(a => a.resolved).length, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          ].map((kpi) => (
            <div className="kpi-card" key={kpi.label} style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg }}>
              <div className="kpi-info" style={{ textAlign: 'center' }}>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['all', 'critical', 'warning', 'info'].map((f) => (
            <button
              key={f}
              id={`alert-filter-${f}`}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All Alerts' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-text">No alerts found</div>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => {
              const Icon = SEVERITY_ICONS[alert.severity] || Info;
              return (
                <div key={alert._id} className={`alert-item severity-${alert.severity}${alert.resolved ? ' resolved' : ''}`} id={`alert-${alert._id}`}>
                  <div className="alert-dot" />
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: alert.severity === 'critical' ? 'rgba(220,38,38,0.15)' : alert.severity === 'warning' ? 'rgba(251,191,36,0.15)' : 'rgba(56,189,248,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={16} style={{
                      color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#fbbf24' : '#38bdf8',
                    }} />
                  </div>
                  <div className="alert-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="alert-title">{alert.title}</div>
                      <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 7px', borderRadius: 10 }}>
                        {TYPE_LABELS[alert.type] || alert.type}
                      </span>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-footer">
                      {alert.zone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <MapPin size={10} /> {alert.zone}
                        </div>
                      )}
                      <div className="alert-time">
                        <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {alert.resolved && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
                          <CheckCircle size={11} /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button
                      id={`resolve-alert-${alert._id}`}
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleResolve(alert._id)}
                      style={{ flexShrink: 0, alignSelf: 'flex-start' }}
                    >
                      <CheckCircle size={13} /> Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
