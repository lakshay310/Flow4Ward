import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, CalendarDays, MapPin, Users, Clock, X, Trash2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { eventsApi } from '../services/api';

const TYPE_COLORS = {
  rally: '#ef4444', festival: '#a855f7', sports: '#3b82f6',
  construction: '#eab308', gathering: '#f97316', other: '#94a3b8',
};

const TYPE_EMOJIS = {
  rally: '📢', festival: '🎪', sports: '🏟️', construction: '🚧', gathering: '👥', other: '📌',
};

// Helper function: Generates local HTML string format (YYYY-MM-DDTHH:MM)
const toLocalISOString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function EventCard({ event, onClick, onDelete }) {
  const color = TYPE_COLORS[event.type] || '#94a3b8';
  return (
    <div
      className="event-card"
      style={{ '--event-color': color }}
      onClick={() => onClick(event._id)}
      id={`event-card-${event._id}`}
    >
      <div className="event-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22 }}>{TYPE_EMOJIS[event.type]}</div>
          <div className="event-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className={`badge badge-${event.severity}`}>{event.severity}</span>
          <button
            className="delete-card-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event._id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            title="Delete Event"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="event-card-meta">
        <div className="event-meta-row">
          <MapPin size={12} />
          <span className="truncate">{event.location.address}</span>
        </div>
        <div className="event-meta-row">
          <Clock size={12} />
          {/* Properly formats the date inside Indian Standard Time bounds */}
          {new Date(event.startDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
          {' → '}
          {new Date(event.endDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
        <div className="event-meta-row">
          <Users size={12} />
          {event.expectedAttendance?.toLocaleString('en-IN')} expected
        </div>
      </div>

      <div className="event-card-footer">
        <span className={`badge badge-${event.type}`}>{event.type}</span>
        <span className={`badge badge-${event.status === 'ongoing' ? 'high' : event.status === 'upcoming' ? 'info' : 'low'}`}>
          {event.status}
        </span>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onCreate }) {
  const now = new Date();

  const [form, setForm] = useState({
    name: '', type: 'rally', description: '',
    location: { address: '', lat: 12.9716, lng: 77.5946, zone: 'Central Zone 1', radius: 500 },
    startDate: toLocalISOString(now), 
    endDate: toLocalISOString(new Date(now.getTime() + 2 * 60 * 60 * 1000)), 
    expectedAttendance: 0, organizer: '', isPlanned: true,
    eventCause: 'others', corridor: 'Non-corridor', priority: 'Medium', requiresRoadClosure: false,
  });
  
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLoc = (k, v) => setForm((f) => ({ ...f, location: { ...f.location, [k]: v } }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Validation Error:\nEvent Name field cannot be left empty. Please fill it out.");
      return;
    }

    if (!form.location.address.trim()) {
      alert("Validation Error:\nAddress details are missing. Please enter a valid location address.");
      return;
    }

    const rawStartInput = document.getElementById('event-start-input')?.value;
    const rawEndInput = document.getElementById('event-end-input')?.value;

    const selectedStartDate = new Date(rawStartInput || form.startDate);
    const currentCheckTime = new Date(new Date().getTime() - 20 * 60 * 1000); // 20 mins grace threshold
    
    if (selectedStartDate < currentCheckTime) {
      alert("Scheduling Conflict:\nThe selected start date or time is in the past. Please select the current time or a future window.");
      return;
    }

    if (new Date(rawEndInput || form.endDate) <= selectedStartDate) {
      alert("Scheduling Conflict:\nEnd date and time must occur after the scheduled start time.");
      return;
    }

    setLoading(true);
    try {
      // Extract target values directly and map the Indian Standard Time offset (+05:30) explicitly
      const finalStart = rawStartInput || form.startDate;
      const finalEnd = rawEndInput || form.endDate;

      const syncPayload = {
        ...form,
        startDate: `${finalStart}:00+05:30`,
        endDate: `${finalEnd}:00+05:30`
      };
      
      await onCreate(syncPayload);
      onClose();
    } catch (err) {
      // Fallback error containment logic for sync threads
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const BENGALURU_ZONES = ['Central Zone 1', 'Central Zone 2', 'North Zone 1', 'South Zone 1', 'East Zone 1', 'West Zone 1'];
  
  const CAUSES = [
    { value: 'accident', label: 'Accident' },
    { value: 'vehicle_breakdown', label: 'Vehicle Breakdown' },
    { value: 'tree_fall', label: 'Tree Fall' },
    { value: 'water_logging', label: 'Water Logging' },
    { value: 'congestion', label: 'Congestion' },
    { value: 'public_event', label: 'Public Event (Cricket, etc.)' },
    { value: 'construction', label: 'Road Construction' },
    { value: 'others', label: 'Others' }
  ];

  const CORRIDORS = [
    'Non-corridor', 'ORR East 1', 'ORR East 2', 'ORR North 1', 'ORR North 2', 
    'ORR West 1', 'Tumkur Road', 'Bellary Road 1', 'Bellary Road 2', 'Hosur Road', 
    'Mysore Road', 'Bannerghata Road', 'Magadi Road', 'West of Chord Road', 
    'CBD 1', 'CBD 2', 'Old Madras Road', 'IRR(Thanisandra road)'
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Register New Event</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input id="event-name-input" className="form-input" placeholder="e.g., IPL Cricket Match - Chinnaswamy" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select id="event-type-select" className="form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {['rally', 'festival', 'sports', 'construction', 'gathering', 'other'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Zone *</label>
                <select id="event-zone-select" className="form-select" value={form.location.zone} onChange={(e) => setLoc('zone', e.target.value)}>
                  {BENGALURU_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Cause *</label>
                <select id="event-cause-select" className="form-select" value={form.eventCause} onChange={(e) => set('eventCause', e.target.value)}>
                  {CAUSES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Corridor Route *</label>
                <select id="event-corridor-select" className="form-select" value={form.corridor} onChange={(e) => set('corridor', e.target.value)}>
                  {CORRIDORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address *</label>
              <input id="event-address-input" className="form-input" placeholder="e.g., Lalbagh Main Road, Wilson Garden, Bengaluru" value={form.location.address} onChange={(e) => setLoc('address', e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input id="event-lat-input" className="form-input" type="number" step="any" value={form.location.lat} onChange={(e) => setLoc('lat', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input id="event-lng-input" className="form-input" type="number" step="any" value={form.location.lng} onChange={(e) => setLoc('lng', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date & Time *</label>
                <input 
                  id="event-start-input" 
                  className="form-input" 
                  type="datetime-local" 
                  min={toLocalISOString(new Date())} 
                  value={form.startDate} 
                  onChange={(e) => set('startDate', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date & Time *</label>
                <input 
                  id="event-end-input" 
                  className="form-input" 
                  type="datetime-local" 
                  min={form.startDate || toLocalISOString(new Date())} 
                  value={form.endDate} 
                  onChange={(e) => set('endDate', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expected Attendance</label>
                <input id="event-attendance-input" className="form-input" type="number" min="0" value={form.expectedAttendance} onChange={(e) => set('expectedAttendance', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority *</label>
                <select id="event-priority-select" className="form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {['Low', 'Medium', 'High'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Organizer</label>
              <input id="event-organizer-input" className="form-input" placeholder="Organizer name" value={form.organizer} onChange={(e) => set('organizer', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea id="event-desc-input" className="form-textarea" placeholder="Event description..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input id="event-planned-checkbox" type="checkbox" checked={form.isPlanned} onChange={(e) => set('isPlanned', e.target.checked)} />
                  <span style={{ color: 'var(--text-secondary)' }}>Planned Event</span>
                </label>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input id="event-closure-checkbox" type="checkbox" checked={form.requiresRoadClosure} onChange={(e) => set('requiresRoadClosure', e.target.checked)} />
                  <span style={{ color: 'var(--text-secondary)' }}>Requires Road Closure</span>
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="create-event-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Register & Predict'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Events({ alertCount }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await eventsApi.getAll(params);
      setEvents(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [filterType, filterStatus]);

  const handleCreate = async (data) => {
    try {
      await eventsApi.create(data);
      alert("Success:\nEvent has been successfully scheduled and logs are synchronized.");
      fetchEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
      // Explicitly captures database-level scheduling conflicts thrown by the controller
      if (err.response && err.response.data && err.response.data.message) {
        alert(`⚠️ Scheduling Conflict Rejected:\n\n${err.response.data.message}`);
      } else {
        alert("System API Error:\nFailed to sync logs with transaction arrays.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this event and its predictions?")) {
      try {
        await eventsApi.delete(id);
        fetchEvents();
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  };

  const filtered = events.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.location.zone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter">
      <Topbar title="Events Management" subtitle="Register, track, and predict event congestion" alertCount={alertCount} />
      <div className="page-content">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="events-search"
              className="form-input"
              placeholder="Search events..."
              style={{ paddingLeft: 34 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select id="filter-type-select" className="form-select" style={{ width: 140 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {['rally', 'festival', 'sports', 'construction', 'gathering', 'other'].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select id="filter-status-select" className="form-select" style={{ width: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {['upcoming', 'ongoing', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button id="create-event-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Register Event
          </button>
        </div>

        {/* Count */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Showing {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </div>

        {/* Grid or Skeletons */}
        {loading ? (
          <div className="events-grid">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-text">No events found</div>
          </div>
        ) : (
          <div className="events-grid">
            {filtered.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                onClick={(id) => navigate(`/events/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {showCreate && (
          <CreateEventModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </div>
    </div>
  );
}