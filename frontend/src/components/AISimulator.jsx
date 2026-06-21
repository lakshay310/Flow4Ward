import React, { useState, useEffect } from 'react';
import { Brain, Users, Shield, Map, ChevronRight, CheckCircle, Zap, ArrowRight, Clock, MapPin, Sparkles } from 'lucide-react';
import { predictionsApi, eventsApi } from '../services/api';

function getRiskColor(score) {
  if (score < 20) return '#22c55e';
  if (score < 35) return '#84cc16';
  if (score < 50) return '#eab308';
  if (score < 65) return '#f97316';
  if (score < 80) return '#ef4444';
  return '#dc2626';
}

function getRiskLabel(score) {
  if (score < 20) return 'Minimal';
  if (score < 35) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 65) return 'High';
  if (score < 80) return 'Severe';
  return 'Critical';
}

const PLAN_ICONS = { officers: Users, barricade: Shield, diversion: Map };

export default function AISimulator({ eventId, predictionId, initialSimulation, initialEvent, onApply }) {
  const [simulation, setSimulation] = useState(initialSimulation);
  
  // Event Parameters state (from image layout)
  const [eventType, setEventType] = useState(initialEvent?.type || 'sports');
  const [crowdSize, setCrowdSize] = useState(initialEvent?.expectedAttendance || 20000);
  const [locationName, setLocationName] = useState(initialEvent?.location?.address || '');
  const [duration, setDuration] = useState(initialEvent?.duration ? Math.round(initialEvent.duration) : 3);
  const [locations, setLocations] = useState([]);

  // Fetch unique event locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await eventsApi.getAll();
        const evs = res.data || [];
        const uniqueAddresses = Array.from(new Set(evs.map(e => e.location?.address).filter(Boolean)));
        if (initialEvent?.location?.address && !uniqueAddresses.includes(initialEvent.location.address)) {
          uniqueAddresses.unshift(initialEvent.location.address);
        }
        setLocations(uniqueAddresses);
      } catch (err) {
        console.error('Failed to fetch event locations:', err);
      }
    };
    fetchLocations();
  }, [initialEvent]);

  // Intervention Resources state
  const [officers, setOfficers] = useState(initialSimulation?.withPlan?.officersDeployed || 15);
  const [barricades, setBarricades] = useState(initialSimulation?.withPlan?.barricadesPlaced || 6);
  const [diversion, setDiversion] = useState(initialSimulation?.withPlan?.diversionActive !== false);

  const [applied, setApplied] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Sync simulation whenever event details change
  useEffect(() => {
    if (initialSimulation) {
      setSimulation(initialSimulation);
      setOfficers(initialSimulation.withPlan?.officersDeployed || 15);
      setBarricades(initialSimulation.withPlan?.barricadesPlaced || 6);
      setDiversion(initialSimulation.withPlan?.diversionActive !== false);
      setApplied(false);
    }
  }, [initialSimulation]);

  // Sync event details when initialEvent changes
  useEffect(() => {
    if (initialEvent) {
      setEventType(initialEvent.type || 'sports');
      setCrowdSize(initialEvent.expectedAttendance || 20000);
      setLocationName(initialEvent.location?.address || '');
      setDuration(initialEvent.duration ? Math.round(initialEvent.duration) : 3);
    }
  }, [initialEvent]);

  const handlePredictImpact = async (e) => {
    e.preventDefault();
    setAnimating(true);
    setApplied(false);

    try {
      const params = {
        expectedAttendance: crowdSize,
        duration: parseFloat(duration),
        eventType,
        eventCause: eventType === 'sports' ? 'public_event' : eventType,
        officersCount: officers,
        barricadesCount: barricades,
        diversionActive: diversion,
        corridor: initialEvent?.corridor || 'Non-corridor',
        locationName: locationName
      };

      const res = await predictionsApi.simulate(eventId, params);
      
      setTimeout(() => {
        setSimulation(res.data);
        setApplied(true);
        setAnimating(false);
        if (onApply) onApply(res.data.withPlan);
      }, 1000);
    } catch (err) {
      console.error('Failed to run AI Simulation:', err);
      setAnimating(false);
    }
  };

  if (!simulation) return null;
  const { withoutPlan, withPlan } = simulation;

  const beforeColor = getRiskColor(withoutPlan.riskScore);
  const afterColor  = getRiskColor(withPlan.riskScore);

  return (
    <div className="simulator-wrapper" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', width: '100%', alignItems: 'stretch' }}>
      {/* ── Left Side: Event & Resource Parameters Card (Styled after the Image) ── */}
      <div className="card" style={{ flex: '1.2 1 400px', minWidth: 320, background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#a855f718', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#a855f7', paddingLeft: 3 }}>
              <Brain size={20} style={{ color: '#a855f7' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Event Parameters</span>
          </div>
        </div>

        <form onSubmit={handlePredictImpact} className="card-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Event Type select */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="form-label" style={{ color: '#64748b', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚡ Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="form-select"
              style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', outline: 'none', width: '100%' }}
            >
              <option value="sports">Cricket Match</option>
              <option value="rally">Political Rally</option>
              <option value="festival">Cultural Festival</option>
              <option value="construction">Construction</option>
              <option value="gathering">Public Gathering</option>
              <option value="other">Others</option>
            </select>
          </div>

          {/* Crowd Size slider */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="form-label" style={{ color: '#64748b', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={14} /> Crowd Size
            </label>
            <input
              type="range"
              min={500}
              max={80000}
              step={500}
              value={crowdSize}
              onChange={(e) => setCrowdSize(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                background: '#e2e8f0',
                borderRadius: 3,
                outline: 'none',
                WebkitAppearance: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8' }}>
              <span>500</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {crowdSize.toLocaleString('en-IN')} attendees
              </span>
              <span>80,000</span>
            </div>
          </div>

          {/* Location field */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="form-label" style={{ color: '#64748b', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> Location
            </label>
            <select
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="form-select"
              style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', outline: 'none', width: '100%' }}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Duration field */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="form-label" style={{ color: '#64748b', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> Duration (hours)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              className="form-input"
              style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Separation Divider */}
          <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          {/* Dynamic Resources section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔧 Dynamic Interventions
            </div>

            {/* Officers allocation slider */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Police Officers</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{officers} deployed</span>
              </label>
              <input
                type="range"
                min={2}
                max={100}
                value={officers}
                onChange={(e) => setOfficers(parseInt(e.target.value))}
                style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2 }}
              />
            </div>

            {/* Barricades allocation slider */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Barricades Setup</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{barricades} placed</span>
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={barricades}
                onChange={(e) => setBarricades(parseInt(e.target.value))}
                style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2 }}
              />
            </div>

            {/* Diversion toggle */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              <span>Arterial Diversions Active</span>
              <input
                type="checkbox"
                checked={diversion}
                onChange={(e) => setDiversion(e.target.checked)}
                style={{
                  width: 36,
                  height: 18,
                  borderRadius: 9,
                  accentColor: '#8b5cf6'
                }}
              />
            </label>
          </div>

          {/* Predict Impact Button (Matching the Image) */}
          <button
            type="submit"
            disabled={animating}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 14,
              padding: '14px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
              marginTop: 6
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 92, 246, 0.25)';
            }}
          >
            {animating ? (
              <>
                <span className="live-dot" style={{ background: 'white' }} />
                Simulating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Predict Impact
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Right Side: Simulation Results Panel ── */}
      <div className="simulator-panel" style={{ flex: '1 1 350px', minWidth: 320 }}>
        <div className="simulator-header">
          <div className="simulator-icon" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
            <Brain size={22} color="white" />
          </div>
          <div>
            <div className="simulator-title">AI Decision Simulator</div>
            <div className="simulator-sub">
              Compare risk before & after applying the intervention resources
            </div>
          </div>
        </div>

        <div className="simulator-body">
          {/* Before / After Comparison */}
          <div className="sim-comparison">
            {/* Before */}
            <div className="sim-state before">
              <div className="sim-state-label">⚠ Without Intervention</div>
              <div className="sim-risk-num" style={{ color: beforeColor }}>
                {withoutPlan.riskScore}
              </div>
              <div className="sim-risk-label">Risk Score</div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                {getRiskLabel(withoutPlan.riskScore)} Congestion
              </div>
            </div>

            {/* Arrow */}
            <div className="sim-arrow">
              {applied ? (
                <div className="sim-reduction-badge">
                  ↓ {withPlan.reductionPercent}% Reduction
                </div>
              ) : (
                <ArrowRight size={24} style={{ color: 'rgba(148,163,184,0.4)' }} />
              )}
            </div>

            {/* After */}
            <div className={`sim-state after${applied ? ' active' : ''}`}>
              <div className="sim-state-label" style={{ color: '#86efac' }}>✓ With Intervention</div>
              <div
                className="sim-risk-num"
                style={{ color: applied ? afterColor : 'rgba(148,163,184,0.3)' }}
              >
                {applied ? withPlan.riskScore : '—'}
              </div>
              <div className="sim-risk-label">Risk Score</div>
              {applied && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#86efac' }}>
                  {getRiskLabel(withPlan.riskScore)} Congestion
                </div>
              )}
            </div>
          </div>

          {/* AI Plan Details */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
              Deployment Overview
            </div>
            <div className="sim-plan-items">
              {withPlan.planDetails?.map((item, i) => {
                const Icon = PLAN_ICONS[item.icon] || Zap;
                return (
                  <div key={i} className={`sim-plan-item${applied ? ' applied' : ''}`}>
                    <div className="sim-plan-icon">
                      <Icon size={15} />
                    </div>
                    <span style={{ flex: 1 }}>{item.action}</span>
                    {applied && (
                      <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Junction comparison */}
          {applied && withPlan.junctionScores && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
                Junction Risk After Plan
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {withPlan.junctionScores.map((j) => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.name}
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${j.risk}%`, height: '100%', background: getRiskColor(j.risk), borderRadius: 3, transition: 'width 1s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: getRiskColor(j.risk), width: 28, textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                      {j.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
