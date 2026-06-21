import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Shield, Clock, AlertTriangle, Users, 
  MapPin, CheckCircle, Smartphone, Database, Compass
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate('/auth');
  };

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <span className="logo-icon">🚦</span>
          <span className="logo-text">Flow4Ward</span>
        </div>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#problem">The Problem</a>
          <a href="#why-flow4ward">Why Us</a>
        </nav>
        <button className="landing-cta-btn" onClick={handleLaunch}>
          Launch Control Center <ArrowRight size={14} />
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="live-pill">
          <span className="pulse-dot"></span>
          Live · Monitoring 6 major zones in Bengaluru
        </div>
        
        <h1 className="hero-title">
          Predict gridlock.<br />
          <span className="gradient-text">Prevent chaos.</span>
        </h1>
        
        <p className="hero-desc">
          Flow4Ward is the AI command center for event-driven traffic. We forecast congestion hours before it forms — and orchestrate manpower, barricading and diversion in real time.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={handleLaunch}>
            Launch Platform <ArrowRight size={16} />
          </button>
          <button className="btn-secondary" onClick={() => navigate('/predictions')}>
            Try the Simulator
          </button>
        </div>

        <div className="partner-logos">
          <span>BENGALURU TRAFFIC POLICE</span>
          <span className="bullet">•</span>
          <span>BBMP</span>
          <span className="bullet">•</span>
          <span>CHINNASWAMY STADIUM</span>
          <span className="bullet">•</span>
          <span>SMART CITIES MISSION</span>
        </div>
      </section>

      {/* Dashboard Browser Preview Mockup */}
      <section className="landing-preview">
        <div className="browser-mockup">
          <div className="browser-header">
            <div className="browser-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="browser-address">
              <Compass size={12} />
              <span>flow4ward.ai/dashboard</span>
            </div>
          </div>
          
          <div className="browser-content">
            <div className="mock-dashboard">
              {/* Mock Map Panel */}
              <div className="mock-map">
                <div className="mock-map-bg">
                  {/* Stylized streets */}
                  <svg className="mock-streets" viewBox="0 0 800 400">
                    <path d="M 50,150 Q 250,50 450,250 T 750,150" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                    <path d="M 100,50 Q 300,350 500,100 T 700,350" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                    <path d="M 0,220 H 800" fill="none" stroke="#cbd5e1" strokeWidth="8" />
                  </svg>
                  {/* Glowing Hotspots */}
                  <div className="glow-hotspot orange" style={{ left: '32%', top: '35%' }}>
                    <div className="ring"></div>
                    <div className="core"></div>
                  </div>
                  <div className="glow-hotspot red" style={{ left: '55%', top: '55%' }}>
                    <div className="ring"></div>
                    <div className="core"></div>
                  </div>
                  <div className="map-badge" style={{ left: '15%', top: '15%' }}>Silk Board · Live</div>
                </div>
              </div>

              {/* Mock Sidebar Stats */}
              <div className="mock-sidebar">
                <div className="mock-widget">
                  <div className="widget-label">Active Events</div>
                  <div className="widget-value">14 <span className="trend-up">+3 today</span></div>
                </div>
                
                <div className="mock-widget">
                  <div className="widget-label">Congestion Index</div>
                  <div className="widget-value color-high">68 <span className="badge-level warning">High</span></div>
                </div>

                <div className="mock-widget">
                  <div className="widget-label">Avg Delay</div>
                  <div className="widget-value">11m <span className="trend-down">-22% vs LY</span></div>
                </div>

                <div className="mock-widget alert-widget">
                  <div className="alert-header">
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>AI PREDICTOR ALERT</span>
                  </div>
                  <div className="alert-body">
                    <strong>Chinnaswamy Match @ 19:30</strong> — expect 41% congestion spike on Queen's Road.
                  </div>
                  <div className="alert-footer">
                    Recommended: 12 constables + 4 barricades at Queen's Circle.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="features">
        <div className="section-center">
          <div className="section-tag">KEY CAPABILITIES</div>
          <h2 className="section-title">AI-Powered Features for Active Decision Support</h2>
          <p className="section-subtitle-text">
            Flow4Ward turns speculative planning into metrics-driven tactical control, empowering city traffic departments with 5 core systems.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Compass size={24} className="feature-icon-purple" />
            </div>
            <h3>Control Room Dashboard</h3>
            <p>Monitor live Bengaluru traffic updates, per-zone congestion meters, and upcoming event lists updated in real-time via Socket.io.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Clock size={24} className="feature-icon-purple" />
            </div>
            <h3>Event Impact Timeline</h3>
            <p>Examine predictive hour-by-hour congestion indicators spanning pre-event, peak, and dispersal intervals for planning officers.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <MapPin size={24} className="feature-icon-purple" />
            </div>
            <h3>Junction Risk Prediction</h3>
            <p>Track coordinate-weighted traffic risk levels and warnings for key metropolitan junctions (Silk Board, KR Puram, Hebbal, and more).</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Users size={24} className="feature-icon-purple" />
            </div>
            <h3>Resource Allocation Optimizer</h3>
            <p>Obtain automated recommendations for deploying personnel brackets, priority levels, and physical barricading per intersection.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CheckCircle size={24} className="feature-icon-purple" />
            </div>
            <h3>AI Decision Simulator</h3>
            <p>Run trial scenarios with active lane closures, custom diversions, and staff increases to pre-evaluate percentage risk reductions.</p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="landing-problem" id="problem">
        <div className="problem-content">
          <div className="section-tag">THE PROBLEM</div>
          <h2 className="section-title">Cities still react. We predict.</h2>
          <p className="problem-desc">
            Concerts, rallies, weddings, festivals — every event sends ripples of congestion through a city. Today, traffic teams only respond once the gridlock has already formed. The cost: <strong>₹1.4 lakh crore</strong> in lost productivity each year, ambulances stuck in traffic, and untrained crowds in unsafe routes.
          </p>
        </div>

        <div className="problem-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Clock size={20} className="icon-purple" />
            </div>
            <div className="stat-number">47 min</div>
            <div className="stat-label">Avg response time after gridlock</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <AlertTriangle size={20} className="icon-purple" />
            </div>
            <div className="stat-number">72%</div>
            <div className="stat-label">Events without traffic plans</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Shield size={20} className="icon-purple" />
            </div>
            <div className="stat-number">3.2x</div>
            <div className="stat-label">Emergency vehicle delays</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Users size={20} className="icon-purple" />
            </div>
            <div className="stat-number">61%</div>
            <div className="stat-label">Manpower over/under-deployed</div>
          </div>
        </div>
      </section>

      {/* Why Current Systems Fail Section */}
      <section className="landing-why-fail" id="why-flow4ward">
        <div className="section-center">
          <div className="section-tag">WHY CURRENT SYSTEMS FAIL</div>
          <h2 className="section-title">Static maps. Stale data. Manual guesswork.</h2>
        </div>

        <div className="fail-cards-grid">
          <div className="fail-card">
            <div className="fail-card-header">
              <Smartphone size={24} className="fail-icon" />
              <h3>Static Maps</h3>
            </div>
            <p>Traditional navigation maps only show congestion <em>after</em> it has already built up. They lack the intelligence to model crowd dispersals or coordinate police deployments before the event begins.</p>
          </div>

          <div className="fail-card">
            <div className="fail-card-header">
              <Database size={24} className="fail-icon" />
              <h3>Stale Data</h3>
            </div>
            <p>GPS and loop sensor aggregation data is historical by the time it is updated in dashboards, lagging behind by 10 to 15 minutes. This leaves field officers zero runway to prevent gridlock.</p>
          </div>

          <div className="fail-card">
            <div className="fail-card-header">
              <Users size={24} className="fail-icon" />
              <h3>Manual Guesswork</h3>
            </div>
            <p>Deploying constables, placing physical barricades, and deciding diversion routes relies entirely on veteran intuition. Without metrics-based optimization, resources are wasted.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="landing-logo">
            <span className="logo-icon">🚦</span>
            <span className="logo-text">Flow4Ward</span>
          </div>
          <div className="footer-tagline">AI-Powered Event Traffic Intelligence Center</div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Flow4Ward. Developed for Bengaluru Smart City Initiative.</p>
        </div>
      </footer>
    </div>
  );
}
