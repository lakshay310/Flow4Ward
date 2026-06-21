import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, AlertTriangle,
  BarChart3, Zap, LogOut, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    label: 'Command',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Control Room' },
      { to: '/events',    icon: CalendarDays,    label: 'Events' },
      { to: '/alerts',    icon: AlertTriangle,   label: 'Alerts', badge: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics',   icon: BarChart3, label: 'Analytics' },
      { to: '/predictions', icon: Zap,       label: 'AI Predictions' },
    ],
  },
];

export default function Sidebar({ alertCount = 0 }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  // Derive initials from the user's name for the avatar
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🚦</div>
          <div className="logo-text">
            <div className="logo-name">Flow4Ward</div>
            <div className="logo-sub">Control Center</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        {NAV.map((section) => (
          <div className="nav-section" key={section.label}>
            <div className="nav-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
                {item.badge && alertCount > 0 && (
                  <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — user card + sign out */}
      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-dot" />
          <span>System Operational</span>
        </div>

        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
            <button
              id="btn-sidebar-signout"
              className="sidebar-signout-btn"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
