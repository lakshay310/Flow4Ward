import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, MapPin, Users, Calendar, Clock, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from 'react-leaflet';
import Topbar from '../components/Topbar';
import AISimulator from '../components/AISimulator';
import ImpactTimeline from '../components/ImpactTimeline';
import JunctionRiskPanel from '../components/JunctionRiskPanel';
import ResourceAllocation from '../components/ResourceAllocation';
import { eventsApi, predictionsApi } from '../services/api';


function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 35) return '#84cc16';
  if (score < 50) return '#eab308';
  if (score < 65) return '#f97316';
  if (score < 80) return '#ef4444';
  return '#dc2626';
}

const ROUTE_COLORS = ['#22d3ee', '#a78bfa', '#f59e0b'];

export default function EventDetail({ alertCount }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingResources, setSavingResources] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [evRes, predRes] = await Promise.all([
          eventsApi.getOne(id),
          predictionsApi.getByEvent(id).catch(() => null),
        ]);
        setEvent(evRes.data);
        if (predRes) setPrediction(predRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleGeneratePrediction = async () => {
    setGenerating(true);
    try {
      const res = await predictionsApi.generate(id);
      setPrediction(res.data);
    } finally {
      setGenerating(false);
    }
  };

  const handleResourceUpdate = async (updatedAllocations) => {
    if (!prediction?._id) return;
    setSavingResources(true);
    try {
      const res = await predictionsApi.updateResources(prediction._id, updatedAllocations);
      setPrediction(res.data);
    } catch (err) {
      console.error('Failed to save resource override:', err);
    } finally {
      setSavingResources(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <Topbar title="Event Details" alertCount={alertCount} />
        <div className="page-content">
          <div style={{ display: 'grid', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const impactScore = prediction?.trafficImpactScore;
  const impactColor = impactScore != null ? getRiskColor(impactScore) : '#94a3b8';
  // Sum from resourceAllocation if present, else fall back to manpowerRequired
  const totalOfficers =
    prediction?.resourceAllocation?.reduce((s, a) => s + a.officersAssigned, 0) ||
    prediction?.manpowerRequired?.reduce((s, m) => s + (m.officers || 0), 0) ||
    (impactScore ? Math.ceil(impactScore / 5) + 5 : 0);

  const totalBarricades =
    prediction?.barricadePoints?.length ||
    prediction?.resourceAllocation?.filter(a => (a.barricades || 0) > 0).length || 0;

  return (
    <div className="page-enter">
      <Topbar title={event.name} subtitle={`${event.type} · ${event.location.zone}`} alertCount={alertCount} />
      <div className="page-content">

        {/* Back + Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button id="back-btn" className="btn btn-ghost btn-sm" onClick={() => navigate('/events')}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ flex: 1 }} />
          {prediction ? (
            <button id="regenerate-btn" className="btn btn-ghost btn-sm" onClick={handleGeneratePrediction} disabled={generating}>
              <RefreshCw size={13} className={generating ? 'spin' : ''} />
              {generating ? 'Generating...' : 'Re-run Prediction'}
            </button>
          ) : (
            <button id="generate-prediction-btn" className="btn btn-primary" onClick={handleGeneratePrediction} disabled={generating}>
              <Zap size={14} />
              {generating ? 'Running AI...' : 'Generate AI Prediction'}
            </button>
          )}
        </div>

        {/* Event Info + Score */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Event Information</span>
              <span className={`badge badge-${event.severity}`}>{event.severity}</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: MapPin, label: 'Location', value: event.location.address },
                  { icon: MapPin, label: 'Zone', value: event.location.zone },
                  { icon: Calendar, label: 'Start', value: new Date(event.startDate).toLocaleString('en-IN') },
                  { icon: Clock, label: 'Duration', value: `${event.duration?.toFixed(1) || '—'} hours` },
                  { icon: Users, label: 'Attendance', value: (event.expectedAttendance || 0).toLocaleString('en-IN') },
                  { icon: Users, label: 'Organizer', value: event.organizer || 'Unknown' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      <Icon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              {event.description && (
                <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {event.description}
                </div>
              )}
            </div>
          </div>

          {/* Risk Score display */}
          {prediction ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Zap size={15} style={{ color: impactColor }} /> AI Risk Assessment</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  {(prediction.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {/* Big score ring */}
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  border: `6px solid ${impactColor}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 32px ${impactColor}40`,
                  background: `${impactColor}08`,
                }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: impactColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {impactScore}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
                    {prediction.impactLabel}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%' }}>
                  {[
                    { label: 'Officers', value: totalOfficers, color: '#22d3ee' },
                    { label: 'Barricades', value: totalBarricades, color: '#f97316' },
                    { label: 'Diversions', value: prediction.diversionRoutes?.length || 0, color: '#a78bfa' },
                  ].map((s) => (
                    <div key={s.label} style={{
                      textAlign: 'center', background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)', padding: '12px 8px',
                      border: `1px solid ${s.color}20`,
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <div className="empty-state">
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>No prediction generated yet</div>
                <button id="generate-prediction-btn-2" className="btn btn-primary" onClick={handleGeneratePrediction} disabled={generating}>
                  <Zap size={14} /> Generate AI Prediction
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Resource Prediction & Historical Experience Card ── */}
        {event.historicalExperience && (
          <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #10b981' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={15} style={{ color: '#10b981' }} />
                AI Resource Planning & Historical Experience Baseline
              </span>
              <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                Past Experience Base Limit
              </span>
            </div>
            <div className="card-body">
              <div className="grid-2" style={{ gap: 20 }}>
                {/* Left Side: Summary of Predicted vs Baseline */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Manpower & Barricade Baseline
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Officers */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Traffic Officers</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Personnel required for junctions</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#22d3ee', fontFamily: 'JetBrains Mono' }}>
                            {prediction ? totalOfficers : '—'}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Predicted</div>
                        </div>
                        <div style={{ height: 20, width: 1, background: 'var(--border-dim)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', fontFamily: 'JetBrains Mono' }}>
                            {event.historicalExperience.avgOfficers}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Limit</div>
                        </div>
                      </div>
                    </div>

                    {/* Barricades */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Physical Barricades</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Deployable checkpoint barricades</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316', fontFamily: 'JetBrains Mono' }}>
                            {prediction ? (prediction.barricadePoints?.length || 0) : '—'}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Predicted</div>
                        </div>
                        <div style={{ height: 20, width: 1, background: 'var(--border-dim)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', fontFamily: 'JetBrains Mono' }}>
                            {event.historicalExperience.avgBarricades}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Limit</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!prediction && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(234,179,8,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234,179,8,0.15)', fontSize: 11, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💡</span>
                      <span>No active prediction yet. Showing past experience base limits as a recommended starting point.</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Experience from Past Events */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Experience From Past Similar Events
                  </h4>
                  {event.historicalExperience.pastEvents && event.historicalExperience.pastEvents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {event.historicalExperience.pastEvents.map((pe, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12, border: '1px solid var(--border-dim)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pe.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {new Date(pe.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11 }}>
                            <span style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.05)', padding: '2px 6px', borderRadius: 4 }}>👮 {pe.officers}</span>
                            <span style={{ color: '#f97316', background: 'rgba(249,115,22,0.05)', padding: '2px 6px', borderRadius: 4 }}>🚧 {pe.barricades}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 110, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-dim)', fontSize: 12, color: 'var(--text-muted)', gap: 4 }}>
                      <span>📈</span>
                      <span>No past similar events found. Using default cause limits.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {prediction && (
          <>
            {/* ── AI Recommendations & Past Experiences Card ── */}
            {prediction.historicalInsights && (
              <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--text-accent)' }}>
                <div className="card-header">
                  <span className="card-title">
                    <span style={{ marginRight: 6 }}>💡</span>
                    Dataset Past Experience & AI Recommendations
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    SOP Version: {prediction.modelVersion || 'v2.1'}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-dim)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: 16
                  }}>
                    <strong>Historical Insight:</strong> {prediction.historicalInsights.insights}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Recommended SOP (Mitigation Plan)
                    </div>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20, margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {prediction.historicalInsights.sop?.map((sopItem, idx) => (
                        <li key={idx}>{sopItem}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ── Feature 1: AI Simulator ── */}
            <div style={{ marginBottom: 20 }}>
              <AISimulator
                eventId={event._id}
                predictionId={prediction._id}
                initialSimulation={prediction.simulation}
                initialEvent={event}
              />
            </div>

            {/* ── Feature 2: Impact Timeline ── */}
            <div style={{ marginBottom: 20 }}>
              <ImpactTimeline timeline={prediction.timeline} />
            </div>

            {/* ── Features 3 + 4 Side by Side ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <JunctionRiskPanel junctions={prediction.junctionImpact || []} />
              <ResourceAllocation
                allocations={prediction.resourceAllocation || []}
                totalOfficers={totalOfficers}
                onUpdate={handleResourceUpdate}
                saving={savingResources}
              />
            </div>

            {/* ── Diversion Routes Map ── */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title"><MapPin size={15} style={{ color: 'var(--text-accent)' }} /> Barricade & Diversion Map</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="map-container" style={{ height: 380, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                  <MapContainer
                    center={[event.location.lat, event.location.lng]}
                    zoom={13}
                    style={{ height: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; CartoDB'
                    />
                    {/* Event epicenter */}
                    <CircleMarker
                      center={[event.location.lat, event.location.lng]}
                      radius={14}
                      pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.4, weight: 2 }}
                    >
                      <Popup>📍 {event.name}</Popup>
                    </CircleMarker>

                    {/* Barricade points */}
                    {(prediction.barricadePoints || []).map((bp, i) => (
                      <CircleMarker
                        key={i}
                        center={[bp.lat, bp.lng]}
                        radius={7}
                        pathOptions={{
                          color: bp.type === 'hard' ? '#ef4444' : bp.type === 'soft' ? '#f97316' : '#a78bfa',
                          fillColor: bp.type === 'hard' ? '#ef4444' : bp.type === 'soft' ? '#f97316' : '#a78bfa',
                          fillOpacity: 0.8,
                          weight: 2,
                        }}
                      >
                        <Popup>🚧 {bp.label} ({bp.type})</Popup>
                      </CircleMarker>
                    ))}

                    {/* Diversion routes */}
                    {(prediction.diversionRoutes || []).map((route, i) => (
                      route.path?.length > 1 && (
                        <Polyline
                          key={i}
                          positions={route.path.map((p) => [p.lat, p.lng])}
                          pathOptions={{ color: route.color || ROUTE_COLORS[i], weight: 3, dashArray: route.recommended ? null : '8,4', opacity: 0.85 }}
                        >
                          <Popup>🛣️ {route.name} (+{route.estimatedDelay} min)</Popup>
                        </Polyline>
                      )
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Route legend */}
              <div className="card-body" style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22d3ee' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Event Epicenter</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Hard Barricade</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Soft Checkpoint</span>
                  </div>
                  {(prediction.diversionRoutes || []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 20, height: 3, background: r.color || ROUTE_COLORS[i], borderRadius: 2 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{r.name} {r.recommended ? '⭐' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
