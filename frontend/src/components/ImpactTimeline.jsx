import React from 'react';
import { Clock } from 'lucide-react';

function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 35) return '#84cc16';
  if (score < 50) return '#eab308';
  if (score < 65) return '#f97316';
  if (score < 80) return '#ef4444';
  return '#dc2626';
}

export default function ImpactTimeline({ timeline = [] }) {
  if (!timeline.length) return null;
  const maxRisk = Math.max(...timeline.map((t) => t.risk), 1);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <Clock size={15} style={{ color: 'var(--text-accent)' }} />
          Event Impact Timeline
        </span>
        <div className="live-indicator">
          <div className="live-dot" />
          Hour-by-Hour
        </div>
      </div>
      <div className="card-body">
        <div className="timeline-bar-container">
          {timeline.map((entry, i) => {
            const pct = Math.round((entry.risk / maxRisk) * 100);
            const color = getRiskColor(entry.risk);
            return (
              <div className="timeline-row" key={i} title={`${entry.hour}: Risk ${entry.risk} — ${entry.label}`}>
                <div className="timeline-time">{entry.hour}</div>
                <div className="timeline-track">
                  <div
                    className={`timeline-fill ${entry.isEvent ? 'event-active' : 'event-inactive'}`}
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
                  >
                    {pct > 18 && (
                      <span className="timeline-label-in">{entry.label}</span>
                    )}
                  </div>
                  {entry.isEvent && (
                    <div style={{
                      position: 'absolute',
                      top: 0, right: 0, bottom: 0,
                      width: 2,
                      background: 'rgba(34,211,238,0.3)',
                    }} />
                  )}
                </div>
                <div className="timeline-risk-val" style={{ color }}>
                  {entry.risk}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Minimal', color: '#22c55e' },
            { label: 'Low', color: '#84cc16' },
            { label: 'Moderate', color: '#eab308' },
            { label: 'High', color: '#f97316' },
            { label: 'Severe', color: '#ef4444' },
            { label: 'Critical', color: '#dc2626' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
