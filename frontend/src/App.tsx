import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './views/OverviewView';
import { LivePositionsView } from './views/LivePositionsView';
import { TradeHistoryView } from './views/TradeHistoryView';
import { TraderDNAView } from './views/TraderDNAView';
import { INITIAL_OPEN_TRADE, MOCK_ACTIVE_POSITIONS } from './data/mockData';
import { Trade, ActivePosition } from './types/trade';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [broker, setBroker] = useState<string>('kite');
  const [trade, setTrade] = useState<Trade>(INITIAL_OPEN_TRADE);
  const [selectedPosition, setSelectedPosition] = useState<ActivePosition | null>(MOCK_ACTIVE_POSITIONS[0]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Sync theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSelectPosition = (pos: ActivePosition) => {
    setSelectedPosition(pos);
    setActiveTab('live-positions');
  };

  return (
    <div className="app-container">
      {/* Sidebar with LIVE and MEMORY categories */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        broker={broker}
        setBroker={setBroker}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* View Routing */}
        {activeTab === 'overview' && (
          <OverviewView
            trade={trade}
            onSelectPosition={handleSelectPosition}
          />
        )}

        {activeTab === 'live-positions' && (
          <LivePositionsView
            trade={trade}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
          />
        )}

        {activeTab === 'trade-history' && <TradeHistoryView />}

        {activeTab === 'trader-dna' && <TraderDNAView />}
      </main>
    </div>
  );
}

export default App;
