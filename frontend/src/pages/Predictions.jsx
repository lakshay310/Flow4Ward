import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import Topbar from '../components/Topbar';
import { predictionsApi, eventsApi } from '../services/api';

function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 35) return '#84cc16';
  if (score < 50) return '#eab308';
  if (score < 65) return '#f97316';
  if (score < 80) return '#ef4444';
  return '#dc2626';
}

export default function Predictions({ alertCount }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    predictionsApi.getAll().then((r) => setPredictions(r.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter">
      <Topbar title="AI Predictions" subtitle="All generated traffic impact predictions" alertCount={alertCount} />
      <div className="page-content">
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No predictions yet. Go to an event and run the AI prediction.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {predictions.map((pred) => {
              const color = getRiskColor(pred.trafficImpactScore);
              return (
                <div
                  key={pred._id}
                  className="card"
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${color}` }}
                  onClick={() => navigate(`/events/${pred.eventId?._id}`)}
                  id={`pred-card-${pred._id}`}
                >
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                      border: `3px solid ${color}`, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', background: `${color}10`,
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color }}>{pred.trafficImpactScore}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>risk</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {pred.eventId?.name || 'Unknown Event'}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span className={`badge badge-${pred.impactLabel === 'critical' ? 'critical' : pred.impactLabel === 'severe' ? 'high' : pred.impactLabel === 'moderate' ? 'medium' : 'low'}`}>
                          {pred.impactLabel}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Confidence: {((pred.confidence || 0.85) * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {pred.junctionImpact?.length || 0} junctions analyzed
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(pred.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-accent)', fontSize: 12, flexShrink: 0 }}>
                      <Zap size={13} /> View Details <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
