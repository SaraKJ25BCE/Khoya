import React from 'react';
import { LayoutDashboard, Layers, History, Dna, Sun, Moon } from 'lucide-react';

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
        {/* Brand Header */}
        <div style={{ marginBottom: '28px', paddingLeft: '4px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', letterSpacing: '0.04em', lineHeight: 1, color: 'var(--text-main)' }}>
            KHOYA
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.74rem', color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '4px' }}>
            Options Intelligence
          </div>
        </div>

        {/* Section 1: LIVE */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '8px' }}>
            LIVE
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              id="nav-btn-overview"
              className={`nav-pill ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </button>

            <button
              id="nav-btn-live-positions"
              className={`nav-pill ${activeTab === 'live-positions' ? 'active' : ''}`}
              onClick={() => setActiveTab('live-positions')}
            >
              <Layers size={16} />
              <span>Live Positions</span>
            </button>
          </nav>
        </div>

        {/* Section 2: MEMORY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '8px' }}>
            MEMORY
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              id="nav-btn-trade-history"
              className={`nav-pill ${activeTab === 'trade-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('trade-history')}
            >
              <History size={16} />
              <span>Trade History</span>
            </button>

            <button
              id="nav-btn-trader-dna"
              className={`nav-pill ${activeTab === 'trader-dna' ? 'active' : ''}`}
              onClick={() => setActiveTab('trader-dna')}
            >
              <Dna size={16} />
              <span>Trader DNA</span>
            </button>
          </nav>
        </div>

        {/* Theme Toggle */}
        <div>
          <button
            id="theme-toggle-button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={14} color="#38bdf8" /> : <Sun size={14} color="#d97706" />}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Appearance
              </span>
            </div>
            <div className="theme-switch-badge">
              {theme === 'dark' ? 'DARK' : 'LIGHT'}
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
