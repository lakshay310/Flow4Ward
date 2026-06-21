import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import { Activity, CalendarDays, AlertTriangle, Zap, Users, MapPin, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Topbar from '../components/Topbar';
import { eventsApi, trafficApi, alertsApi } from '../services/api';
import socket from '../services/socket';

function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 40) return '#eab308';
  if (score < 65) return '#f97316';
  return '#ef4444';
}

// Bengaluru zone map positions (real coordinates from Astram dataset)
const ZONE_POSITIONS = {
  'Central Zone 1': [12.9762, 77.5929],  // Cubbon Park / MG Road
  'Central Zone 2': [12.9693, 77.5937],  // Shivaji Nagar / Richmond Road
  'North Zone 1':   [13.0418, 77.5947],  // Hebbal / Bellary Road
  'North Zone 2':   [13.0634, 77.5933],  // Yelahanka / Bellary Road 2
  'South Zone 1':   [12.9172, 77.6220],  // Silk Board / Hosur Road
  'South Zone 2':   [12.9077, 77.6005],  // BTM Layout / Bannerghatta
  'East Zone 1':    [12.9694, 77.7006],  // Marathahalli / ORR East
  'East Zone 2':    [13.0008, 77.6813],  // KR Puram / Whitefield
  'West Zone 1':    [13.0262, 77.5442],  // Yeshwanthpur / Tumkur Road
  'West Zone 2':    [12.9740, 77.5452],  // Chord Road / Vijayanagara
};

export default function Dashboard({ alertCount, setAlertCount }) {
  const [events, setEvents] = useState([]);
  const [liveTraffic, setLiveTraffic] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, ongoing: 0, critical: 0 });
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [evRes, liveRes, alertRes, statsRes, histRes] = await Promise.all([
          eventsApi.getAll({ limit: 6, status: 'upcoming' }),
          trafficApi.getLive(),
          alertsApi.getAll({ resolved: false, limit: 8 }),
          eventsApi.getStats(),
          trafficApi.getAll({ hours: 6, limit: 60 }),
        ]);
        setEvents(evRes.data || []);
        setLiveTraffic(liveRes.data || []);
        setAlerts(alertRes.data || []);
        setStats(statsRes.data || {});

        // Build chart data from history
        const grouped = {};
        (histRes.data || []).forEach((r) => {
          const t = new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          if (!grouped[t]) grouped[t] = { time: t, avg: 0, count: 0 };
          grouped[t].avg += r.congestionLevel;
          grouped[t].count += 1;
        });
        const chartData = Object.values(grouped).map((g) => ({ time: g.time, congestion: Math.round(g.avg / g.count) })).slice(-20);
        setTrafficHistory(chartData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    // Real-time updates
    socket.on('traffic_update', (data) => setLiveTraffic(data));
    socket.on('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 7)]);
      setAlertCount?.((n) => n + 1);
    });
    socket.on('alert_resolved', ({ id }) =>
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, resolved: true } : a)))
    );

    return () => {
      socket.off('traffic_update');
      socket.off('new_alert');
      socket.off('alert_resolved');
    };
  }, []);

  const avgCongestion = liveTraffic.length
    ? Math.round(liveTraffic.reduce((s, z) => s + z.congestionLevel, 0) / liveTraffic.length)
    : 0;

  const KPIs = [
    { label: 'Active Events', value: stats.upcoming + stats.ongoing || 0, icon: CalendarDays, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', delta: `${stats.upcoming} upcoming` },
    { label: 'Critical Events', value: stats.critical || 0, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', delta: 'Require attention', up: true },
    { label: 'Avg Congestion', value: `${avgCongestion}%`, icon: Activity, color: getRiskColor(avgCongestion), bg: `${getRiskColor(avgCongestion)}18`, delta: avgCongestion > 60 ? 'Heavy traffic' : 'Normal flow' },
    { label: 'Unresolved Alerts', value: alerts.filter(a => !a.resolved).length, icon: Zap, color: '#f97316', bg: 'rgba(249,115,22,0.1)', delta: 'Needs action', up: true },
  ];

  return (
    <div className="page-enter">
      <Topbar title="Bengaluru Traffic Control Room" subtitle="Real-time event congestion intelligence — Bengaluru, Karnataka" alertCount={alertCount} />
      <div className="page-content">

        {/* ── KPI Cards ── */}
        <div className="kpi-grid">
          {KPIs.map((kpi) => (
            <div className="kpi-card" key={kpi.label} style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg }}>
              <div className="kpi-icon"><kpi.icon size={22} /></div>
              <div className="kpi-info">
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
                <div className={`kpi-delta${kpi.up ? ' up' : ' down'}`}>{kpi.delta}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2-1" style={{ marginBottom: 20 }}>
          {/* ── Live Traffic Map ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><MapPin size={15} style={{ color: 'var(--text-accent)' }} /> Live Zone Traffic Map</span>
              <div className="live-indicator"><div className="live-dot" />Real-time</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="map-container" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                <MapContainer center={[12.97, 77.59]} zoom={12} zoomControl scrollWheelZoom={false} style={{ height: '100%', background: '#e2e8f0' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CartoDB'
                  />
                  {liveTraffic.map((zone) => {
                    const pos = ZONE_POSITIONS[zone.zone];
                    if (!pos) return null;
                    return (
                      <CircleMarker
                        key={zone.zone}
                        center={pos}
                        radius={18 + zone.congestionLevel * 0.18}
                        pathOptions={{
                          color: getRiskColor(zone.congestionLevel),
                          fillColor: getRiskColor(zone.congestionLevel),
                          fillOpacity: 0.35,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'Inter', background: '#0a1628', color: '#e2e8f0', padding: 8, borderRadius: 8 }}>
                            <strong>{zone.zone}</strong><br />
                            Congestion: {zone.congestionLevel}%<br />
                            Speed: {zone.avgSpeed?.toFixed(0)} km/h<br />
                            Status: {zone.congestionLabel}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                  {/* Event locations */}
                  {events.slice(0, 3).map((ev) => (
                    <CircleMarker
                      key={ev._id}
                      center={[ev.location.lat, ev.location.lng]}
                      radius={8}
                      pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.8, weight: 2 }}
                    >
                      <Popup>
                        <div style={{ fontFamily: 'Inter', background: '#0a1628', color: '#e2e8f0', padding: 8, borderRadius: 8 }}>
                          <strong>📍 {ev.name}</strong><br />
                          {ev.type} · {ev.location.zone}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Zone Traffic Bars */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <span className="card-title"><Activity size={15} style={{ color: 'var(--text-accent)' }} /> Zone Congestion</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {liveTraffic.map((zone) => (
                    <div key={zone.zone}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{zone.zone}</span>
                        <span style={{ color: getRiskColor(zone.congestionLevel), fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                          {zone.congestionLevel}%
                        </span>
                      </div>
                      <div className="mini-bar" style={{ height: 8 }}>
                        <div className="mini-bar-fill" style={{
                          width: `${zone.congestionLevel}%`,
                          background: `linear-gradient(90deg, ${getRiskColor(zone.congestionLevel)}80, ${getRiskColor(zone.congestionLevel)})`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <span className="card-title"><AlertTriangle size={15} style={{ color: '#ef4444' }} /> Active Alerts</span>
                <div className="live-indicator"><div className="live-dot" />Live</div>
              </div>
              <div className="card-body" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {alerts.filter(a => !a.resolved).slice(0, 5).map((alert) => (
                  <div key={alert._id} className={`alert-item severity-${alert.severity}`} style={{ marginBottom: 8 }}>
                    <div className="alert-dot" />
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-time" style={{ marginTop: 4 }}>
                        {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {alert.zone && ` · ${alert.zone}`}
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.filter(a => !a.resolved).length === 0 && (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active alerts</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Traffic Trend Chart ── */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title"><TrendingUp size={15} style={{ color: 'var(--text-accent)' }} /> Congestion Trend (Last 6 hrs)</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trafficHistory}>
                  <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f1e38', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Area type="monotone" dataKey="congestion" stroke="#22d3ee" fill="url(#cGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Events list */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><CalendarDays size={15} style={{ color: 'var(--text-accent)' }} /> Today's Events</span>
            </div>
            <div className="card-body" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {events.slice(0, 5).map((ev) => (
                <div key={ev._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--border-dim)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: ev.type === 'rally' ? 'rgba(239,68,68,0.15)' : ev.type === 'festival' ? 'rgba(168,85,247,0.15)' : ev.type === 'sports' ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {ev.type === 'rally' ? '📢' : ev.type === 'festival' ? '🎪' : ev.type === 'sports' ? '🏟️' : '🚧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {ev.location.zone} · {new Date(ev.startDate).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <span className={`badge badge-${ev.severity}`}>{ev.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
