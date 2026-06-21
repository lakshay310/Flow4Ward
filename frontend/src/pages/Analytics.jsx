import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Map } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, Legend, PieChart, Pie,
} from 'recharts';
import Topbar from '../components/Topbar';
import { eventsApi, predictionsApi } from '../services/api';

const COLORS = ['#22d3ee', '#a78bfa', '#3b82f6', '#f59e0b', '#22c55e', '#f87171'];

const TYPE_IMPACT = [
  { type: 'Rally', avg: 82, max: 95 },
  { type: 'Festival', avg: 74, max: 89 },
  { type: 'Sports', avg: 68, max: 85 },
  { type: 'Construction', avg: 45, max: 62 },
  { type: 'Gathering', avg: 52, max: 71 },
];

const RADAR_DATA = [
  { subject: 'Traffic Flow', A: 85 },
  { subject: 'Manpower', A: 72 },
  { subject: 'Barricading', A: 68 },
  { subject: 'Diversion', A: 78 },
  { subject: 'Response Time', A: 65 },
  { subject: 'Coverage', A: 80 },
];

export default function Analytics({ alertCount }) {
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, predRes] = await Promise.all([
          eventsApi.getStats(),
          predictionsApi.getAll(),
        ]);
        setStats(statsRes.data);
        setPredictions(predRes.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build type distribution data
  const typeData = stats?.byType?.map((t) => ({ name: t._id, value: t.count })) || [];
  const severityData = stats?.bySeverity?.map((s) => ({ name: s._id, count: s.count })) || [];

  // Prediction scores over time
  const predScores = predictions.map((p, i) => ({
    name: p.eventId?.name ? p.eventId.name.slice(0, 15) + '...' : `Event ${i + 1}`,
    score: p.trafficImpactScore,
    confidence: Math.round((p.confidence || 0.85) * 100),
  }));

  return (
    <div className="page-enter">
      <Topbar title="Analytics" subtitle="Historical event congestion analysis" alertCount={alertCount} />
      <div className="page-content">

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Event Type Impact Bar Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><BarChart2 size={15} style={{ color: 'var(--text-accent)' }} /> Avg Risk by Event Type</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={TYPE_IMPACT} barSize={28}>
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f1e38', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="avg" name="Avg Risk" radius={[4, 4, 0, 0]}>
                    {TYPE_IMPACT.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="max" name="Max Risk" radius={[4, 4, 0, 0]} fill="rgba(239,68,68,0.3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prediction Confidence */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><TrendingUp size={15} style={{ color: 'var(--text-accent)' }} /> AI Prediction Scores</span>
            </div>
            <div className="card-body">
              {predScores.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={predScores}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f1e38', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 4 }} name="Impact Score" />
                    <Line type="monotone" dataKey="confidence" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4 }} name="Confidence %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-text">No predictions yet</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Operational Radar */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Map size={15} style={{ color: 'var(--text-accent)' }} /> Operational Readiness Radar</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Event distribution pie */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Event Type Distribution</span>
            </div>
            <div className="card-body">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name">
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f1e38', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🥧</div>
                  <div className="empty-text">No event data</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary stats table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Severity Distribution</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', count: severityData.find(s=>s.name==='critical')?.count || 0 },
                { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.1)', count: severityData.find(s=>s.name==='high')?.count || 0 },
                { label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.1)', count: severityData.find(s=>s.name==='medium')?.count || 0 },
                { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', count: severityData.find(s=>s.name==='low')?.count || 0 },
              ].map((s) => (
                <div key={s.label} style={{
                  background: s.bg, border: `1px solid ${s.color}25`,
                  borderRadius: 'var(--radius-md)', padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
