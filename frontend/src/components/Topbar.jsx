import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, subtitle, alertCount = 0 }) {
  const [time, setTime]       = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate              = useNavigate();
  const { user, signOut }     = useAuth();
  const menuRef               = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate('/', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="page-title">{title}</span>
        {subtitle && <span className="page-subtitle">{subtitle}</span>}
      </div>

      <div className="topbar-right">
        <div className="live-indicator">
          <div className="live-dot" />
          Live
        </div>

        <div className="topbar-time">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        <button className="alert-bell" onClick={() => navigate('/alerts')} id="topbar-alert-btn">
          <Bell size={15} />
          {alertCount > 0 && <span className="alert-badge">{alertCount > 9 ? '9+' : alertCount}</span>}
        </button>

        {/* User avatar + dropdown */}
        {user && (
          <div className="topbar-user" ref={menuRef}>
            <button
              id="btn-topbar-user"
              className={`topbar-avatar-btn ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="User menu"
              aria-expanded={menuOpen}
            >
              <div className="topbar-avatar">{initials}</div>
              <ChevronDown size={12} className="topbar-chevron" />
            </button>

            {menuOpen && (
              <div className="topbar-user-menu" role="menu">
                <div className="topbar-menu-header">
                  <div className="topbar-menu-name">{user.name}</div>
                  <div className="topbar-menu-email">{user.email}</div>
                </div>
                <div className="topbar-menu-divider" />
                <button
                  id="btn-topbar-signout"
                  className="topbar-menu-item topbar-menu-signout"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
