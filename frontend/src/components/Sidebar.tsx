import React from 'react';
import { LayoutDashboard, Layers, History, Dna, ShieldCheck, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  broker: string;
  setBroker: (broker: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  theme,
  toggleTheme
}) => {
  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Header (No purple box background) */}
        <div style={{ marginBottom: '28px', paddingLeft: '4px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', letterSpacing: '0.06em', lineHeight: 1, color: 'var(--text-main)' }}>
            KHOYA
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>
            Options Intelligence
          </div>
        </div>

        {/* Section 1: LIVE */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '8px' }}>
            LIVE
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              id="nav-btn-overview"
              className={`nav-pill ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{ justifyContent: 'flex-start', padding: '10px 18px' }}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </button>

            <button
              id="nav-btn-live-positions"
              className={`nav-pill ${activeTab === 'live-positions' ? 'active' : ''}`}
              onClick={() => setActiveTab('live-positions')}
              style={{ justifyContent: 'flex-start', padding: '10px 18px' }}
            >
              <Layers size={16} />
              <span>Live Positions</span>
            </button>
          </nav>
        </div>

        {/* Section 2: MEMORY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '8px' }}>
            MEMORY
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              id="nav-btn-trade-history"
              className={`nav-pill ${activeTab === 'trade-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('trade-history')}
              style={{ justifyContent: 'flex-start', padding: '10px 18px' }}
            >
              <History size={16} />
              <span>Trade History</span>
            </button>

            <button
              id="nav-btn-trader-dna"
              className={`nav-pill ${activeTab === 'trader-dna' ? 'active' : ''}`}
              onClick={() => setActiveTab('trader-dna')}
              style={{ justifyContent: 'flex-start', padding: '10px 18px' }}
            >
              <Dna size={16} />
              <span>Trader DNA</span>
            </button>
          </nav>
        </div>

        {/* Light / Dark Mode Toggle Button */}
        <div>
          <button
            id="theme-toggle-button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={15} color="#38bdf8" /> : <Sun size={15} color="#d97706" />}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Appearance
              </span>
            </div>
            <div className="theme-switch-badge">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </div>
          </button>
        </div>
      </div>

      {/* Broker Notice at Bottom matching Image 2 */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginTop: '20px'
        }}
      >
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
          Broker-independent. Khoya never places or executes orders.
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--color-green)', fontWeight: 600 }}>
          Connected to Python FastAPI engine
        </span>
      </div>
    </aside>
  );
};
