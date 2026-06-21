import React, { useState, useEffect } from 'react';
import { Users, Shield, AlertTriangle, RotateCcw, Save, CheckCircle, Info } from 'lucide-react';

const PRIORITY_COLOR = { critical: '#dc2626', high: '#ef4444', medium: '#f97316', low: '#22c55e' };

export default function ResourceAllocation({ allocations = [], totalOfficers = 0, onUpdate, saving }) {
  // Store raw string values so inputs don't freeze mid-type
  const [officerValues, setOfficerValues] = useState([]);
  const [barricadeValues, setBarricadeValues] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reset when allocations prop changes (re-generate)
  useEffect(() => {
    setOfficerValues(allocations.map((a) => String(a.officersAssigned ?? 0)));
    setBarricadeValues(allocations.map((a) => String(a.barricades ?? 0)));
    setIsDirty(false);
    setSaved(false);
  }, [allocations]);

  if (!allocations.length) return null;

  // Compute violations and totals from current string values
  const officerNums = officerValues.map((v) => (v === '' ? 0 : parseInt(v, 10) || 0));
  const barricadeNums = barricadeValues.map((v) => (v === '' ? 0 : parseInt(v, 10) || 0));
  const totalEdited = officerNums.reduce((s, n) => s + n, 0);
  const violations = allocations.map((a, i) => officerNums[i] < (a.aiMinOfficers ?? 0));
  const hasViolations = violations.some(Boolean);

  const setOfficer = (i, val) => {
    setOfficerValues((prev) => prev.map((v, idx) => idx === i ? val : v));
    setIsDirty(true);
    setSaved(false);
  };

  const setBarricade = (i, val) => {
    setBarricadeValues((prev) => prev.map((v, idx) => idx === i ? val : v));
    setIsDirty(true);
    setSaved(false);
  };

  const resetToAI = () => {
    setOfficerValues(allocations.map((a) => String(a.officersAssigned ?? 0)));
    setBarricadeValues(allocations.map((a) => String(a.barricades ?? 0)));
    setIsDirty(false);
    setSaved(false);
  };

  const handleApply = async () => {
    if (hasViolations || !isDirty) return;
    const updated = allocations.map((a, i) => ({
      ...a,
      officersAssigned: officerNums[i],
      barricades: barricadeNums[i],
    }));
    await onUpdate?.(updated);
    setSaved(true);
    setIsDirty(false);
  };

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="card-header">
        <span className="card-title">
          <Users size={15} style={{ color: 'var(--text-accent)' }} />
          Resource Allocation Optimizer
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isDirty && (
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 12,
              background: 'rgba(234,179,8,0.12)', color: '#eab308',
              border: '1px solid rgba(234,179,8,0.3)', fontWeight: 700,
            }}>
              ✎ Operator Override
            </span>
          )}
          {saved && !isDirty && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, padding: '3px 8px', borderRadius: 12,
              background: 'rgba(34,197,94,0.12)', color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700,
            }}>
              <CheckCircle size={11} /> Saved
            </span>
          )}
          <div style={{
            background: 'rgba(34,211,238,0.08)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px',
            fontSize: 12, color: 'var(--text-accent)', fontWeight: 700, fontFamily: 'JetBrains Mono',
          }}>
            {totalEdited} Total Officers
          </div>
        </div>
      </div>

      {/* ── AI floor notice ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: 'rgba(34,211,238,0.04)',
        borderBottom: '1px solid var(--border-dim)', fontSize: 12, color: 'var(--text-muted)',
      }}>
        <Info size={12} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
        Edit officers and barricades per junction. Officers cannot go below the&nbsp;
        <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>AI Min</span>.
      </div>

      {/* ── Table ── */}
      <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="resource-table">
          <thead>
            <tr>
              <th>Junction</th>
              <th>Priority</th>
              <th>Officers</th>
              <th>AI Min</th>
              <th>Barricades</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((alloc, i) => {
              const aiMin = alloc.aiMinOfficers ?? 0;
              const isViolation = violations[i];
              const officerChanged = officerNums[i] !== (alloc.officersAssigned ?? 0);
              const barricadeChanged = barricadeNums[i] !== (alloc.barricades ?? 0);
              const isOverridden = officerChanged || barricadeChanged;

              return (
                <tr
                  key={i}
                  style={{
                    borderLeft: isOverridden ? '3px solid rgba(234,179,8,0.6)' : '3px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Junction */}
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                      {alloc.junction?.name || alloc.zone || `Zone ${i + 1}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {alloc.roles?.join(', ')}
                    </div>
                  </td>

                  {/* Priority badge */}
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      background: `${PRIORITY_COLOR[alloc.priority] || '#94a3b8'}15`,
                      color: PRIORITY_COLOR[alloc.priority] || '#94a3b8',
                      border: `1px solid ${PRIORITY_COLOR[alloc.priority] || '#94a3b8'}30`,
                    }}>
                      {(alloc.priority === 'high' || alloc.priority === 'critical') && <AlertTriangle size={10} />}
                      {alloc.priority}
                    </span>
                  </td>

                  {/* Officers — editable */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={13} style={{ color: isViolation ? '#ef4444' : 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          id={`officers-input-${i}`}
                          type="number"
                          min={0}
                          value={officerValues[i] ?? ''}
                          onChange={(e) => setOfficer(i, e.target.value)}
                          style={{
                            width: 72, padding: '5px 8px', borderRadius: 6, fontSize: 14,
                            fontWeight: 700, fontFamily: 'JetBrains Mono',
                            border: `1px solid ${isViolation ? '#ef4444' : 'var(--border-subtle)'}`,
                            background: isViolation ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                            color: isViolation ? '#ef4444' : 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                      </div>
                      {isViolation && (
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, paddingLeft: 20 }}>
                          ↑ Min required: {aiMin}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* AI Min badge */}
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                      fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono',
                      background: 'rgba(34,211,238,0.1)', color: 'var(--text-accent)',
                      border: '1px solid rgba(34,211,238,0.25)',
                    }}>
                      {aiMin}
                    </span>
                  </td>

                  {/* Barricades — editable */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={13} style={{ color: '#f97316', flexShrink: 0 }} />
                      <input
                        id={`barricades-input-${i}`}
                        type="number"
                        min={0}
                        value={barricadeValues[i] ?? ''}
                        onChange={(e) => setBarricade(i, e.target.value)}
                        style={{
                          width: 60, padding: '5px 8px', borderRadius: 6, fontSize: 14,
                          fontWeight: 700, fontFamily: 'JetBrains Mono',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-elevated)', color: '#f97316',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* ── Footer actions ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderTop: '1px solid var(--border-dim)',
        gap: 12,
      }}>
        <button
          id="reset-to-ai-btn"
          className="btn btn-ghost btn-sm"
          onClick={resetToAI}
          disabled={!isDirty}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RotateCcw size={13} /> Reset to AI
        </button>

        {hasViolations && (
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, flex: 1, textAlign: 'center' }}>
            ⚠ One or more junctions below AI minimum
          </span>
        )}

        <button
          id="apply-resources-btn"
          className="btn btn-primary btn-sm"
          onClick={handleApply}
          disabled={!isDirty || hasViolations || saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
}
