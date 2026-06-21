import React from 'react';
import { MapPin } from 'lucide-react';

function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 35) return '#84cc16';
  if (score < 50) return '#eab308';
  if (score < 65) return '#f97316';
  if (score < 80) return '#ef4444';
  return '#dc2626';
}

const SEVERITY_LABELS = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export default function JunctionRiskPanel({ junctions = [] }) {
  if (!junctions.length) return null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <MapPin size={15} style={{ color: 'var(--text-accent)' }} />
          Junction Impact Prediction
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {junctions.length} junctions analyzed
        </span>
      </div>
      <div className="card-body">
        <div className="junction-list">
          {junctions.map((j, i) => {
            const color = getRiskColor(j.risk);
            const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
            return (
              <div className="junction-item" key={j.id}>
                <div className={`junction-rank ${rankClass}`}>{i + 1}</div>
                <div className="junction-info">
                  <div className="junction-name">{j.name}</div>
                  <div className="junction-meta">
                    {j.distanceKm != null ? `${j.distanceKm} km from event` : ''} ·{' '}
                    <span style={{ color, fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11 }}>
                      {SEVERITY_LABELS[j.severity] || j.severity}
                    </span>
                  </div>
                </div>
                <div className="junction-risk-bar">
                  <div className="junction-risk-label" style={{ color }}>
                    {j.risk}
                  </div>
                  <div className="mini-bar">
                    <div
                      className="mini-bar-fill"
                      style={{ width: `${j.risk}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Critical warning */}
        {junctions.filter((j) => j.severity === 'critical').length > 0 && (
          <div style={{
            marginTop: 16,
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 12,
            color: '#fca5a5',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            ⚠️ {junctions.filter((j) => j.severity === 'critical').length} junction(s) at critical risk — immediate deployment required
          </div>
        )}
      </div>
    </div>
  );
}
