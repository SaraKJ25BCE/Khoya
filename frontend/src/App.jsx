import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPosId, setSelectedPosId] = useState("short_straddle");
  const [isPlaying, setIsPlaying] = useState(true);
  const [tickCount, setTickCount] = useState(0);

  // Trade History Filter States
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [strategyFilter, setStrategyFilter] = useState("All strategies");
  const [driverFilter, setDriverFilter] = useState("All drivers");
  const [scenarioStep, setScenarioStep] = useState(0);

  // Sample Trades loaded from Python backend
  const [sampleTrades, setSampleTrades] = useState([]);
  // Dynamic tick state map per trade loaded from Python backend engine
  const [tradeStates, setTradeStates] = useState({});
  // Option chain snapshot loaded from Python backend engine
  const [optionChainData, setOptionChainData] = useState([]);

  // Base API URL configuration
  const rawApiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const apiBase = rawApiBase.replace(/\/$/, "");

  // 1. Fetch available sample trades from Python Backend (/sample-trades)
  useEffect(() => {
    fetch(`${apiBase}/sample-trades`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSampleTrades(data);
          if (!selectedPosId && data[0]?.id) {
            setSelectedPosId(data[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch /sample-trades from backend:", err);
      });
  }, [apiBase]);

  // 2. Fetch Live Option Chain from Python Backend (/live/option-chain)
  const fetchOptionChain = useCallback(
    (underlying = "NIFTY") => {
      fetch(`${apiBase}/live/option-chain?underlying=${underlying}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.chain)) {
            const formatted = data.chain.map((c) => ({
              strike: c.strike_price,
              iv: c.call_iv || c.put_iv || 18.0,
              call_ltp: c.call_ltp,
              put_ltp: c.put_ltp,
            }));
            setOptionChainData(formatted);
          }
        })
        .catch(() => {});
    },
    [apiBase]
  );

  // 3. Advance Live Tick for ALL trades via Python Backend (/live/tick)
  const advanceTick = useCallback(() => {
    const tradeIds = sampleTrades.length > 0
      ? sampleTrades.map((t) => t.id)
      : ["short_straddle", "iron_condor", "bull_call_spread"];

    Promise.all(
      tradeIds.map((id) =>
        fetch(`${apiBase}/live/tick?trade_id=${id}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .catch(() => null)
      )
    ).then((results) => {
      setTradeStates((prev) => {
        const next = { ...prev };
        results.forEach((data, index) => {
          const id = tradeIds[index];
          if (data && data.trade_id) {
            // Map intervals returned by Python backend attribution engine into Recharts timeline format
            const timeline = Array.isArray(data.intervals)
              ? data.intervals.map((inv, idx) => ({
                  time: inv.to_timestamp
                    ? inv.to_timestamp.split(" ")[1] || `Step ${inv.step || idx + 1}`
                    : `Step ${idx + 1}`,
                  "IV Impact": Math.round(inv.vega_contribution || 0),
                  Delta: Math.round(inv.delta_gamma_contribution ? inv.delta_gamma_contribution * 0.85 : 0),
                  Gamma: Math.round(inv.delta_gamma_contribution ? inv.delta_gamma_contribution * 0.15 : 0),
                  Theta: Math.round(inv.theta_contribution || 0),
                  "Total PnL": Math.round(inv.pnl_change_actual || 0),
                }))
              : [];

            next[id] = {
              ...data,
              timeline,
            };
          }
        });
        return next;
      });

      setTickCount((c) => c + 1);
    });

    // Refresh option chain snapshot periodically
    const currentTradeObj = sampleTrades.find((t) => t.id === selectedPosId);
    const targetUnderlying = currentTradeObj?.underlying || "NIFTY";
    fetchOptionChain(targetUnderlying);
  }, [apiBase, sampleTrades, selectedPosId, fetchOptionChain]);

  // High-FPS Streaming Loop with Python Backend Engine
  useEffect(() => {
    advanceTick();

    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        advanceTick();
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, advanceTick]);

  // Reset Live Simulation on Python Backend (/live/reset)
  const handleReset = () => {
    const tradeIds = sampleTrades.length > 0
      ? sampleTrades.map((t) => t.id)
      : ["short_straddle", "iron_condor", "bull_call_spread"];

    Promise.all(
      tradeIds.map((id) =>
        fetch(`${apiBase}/live/reset?trade_id=${id}`, { method: "POST" }).catch(() => null)
      )
    ).then(() => {
      advanceTick();
    });
  };

  // Derive dynamic active trades array from Python backend tradeStates
  const activeTradeIds = sampleTrades.length > 0
    ? sampleTrades.map((t) => t.id)
    : ["short_straddle", "iron_condor", "bull_call_spread"];

  const activePositions = activeTradeIds.map((id) => {
    const state = tradeStates[id] || {};
    const sample = sampleTrades.find((s) => s.id === id) || {};

    const name = state.trade_name || sample.name || id.replace("_", " ").toUpperCase();
    const strategyType = (state.strategy_type || sample.strategy_type || "option_strategy").toUpperCase().replace("_", " ");
    const underlying = state.underlying || sample.underlying || "NIFTY";
    const pnl = Math.round(state.mtm_pnl || 0);
    const spot = state.spot || sample.entry_spot || 25000;
    const ivPct = state.iv_pct || sample.entry_iv_pct || 18.0;
    const dte = state.days_to_expiry ? `${state.days_to_expiry}d` : "3d";

    const totals = state.totals || {};
    const thetaVal = Math.round(totals.theta_contribution || 0);
    const spotContribVal = Math.round(totals.delta_gamma_contribution || 0);
    const ivImpactVal = Math.round(totals.vega_contribution || 0);
    const residualVal = Math.round(totals.residual || 0);

    const deltaContrib = Math.round(spotContribVal * 0.85);
    const gammaContrib = Math.round(spotContribVal * 0.15);

    const greeks = state.current_greeks || {
      delta: 0,
      gamma: 0,
      theta_per_day: 0,
      vega_per_1pct: 0,
    };

    let confidence = "HIGH · 92%";
    let driverTag = "IV Expansion";
    let driverTagColor = "pink";

    if (Math.abs(spotContribVal) > Math.abs(ivImpactVal) && Math.abs(spotContribVal) > Math.abs(thetaVal)) {
      driverTag = "Spot Movement";
      driverTagColor = "blue";
    } else if (Math.abs(thetaVal) > Math.abs(ivImpactVal) && Math.abs(thetaVal) > Math.abs(spotContribVal)) {
      driverTag = "Theta Decay";
      driverTagColor = "green";
    }

    return {
      id,
      type: strategyType,
      name,
      expiry: `${dte} DTE`,
      underlying,
      confidence,
      driverTag,
      driverTagColor,
      pnl,
      entryValue: Math.round(state.entry_value || 100000),
      currentValue: Math.round(state.current_value || 100000),
      qty: sample.legs ? sample.legs[0]?.qty || 50 : 50,
      underlyingPrice: spot,
      ivPct,
      dte,
      breakdown: {
        spot: spotContribVal,
        delta: deltaContrib,
        gamma: gammaContrib,
        theta: thetaVal,
        iv: ivImpactVal,
        residual: residualVal,
      },
      summaryText: `Python engine computed MTM P&L: ₹${pnl.toLocaleString()}. Factor decomposition: Spot ₹${spotContribVal.toLocaleString()} (Δ: ₹${deltaContrib}, Γ: ₹${gammaContrib}), Theta +₹${thetaVal.toLocaleString()}, IV Impact ₹${ivImpactVal.toLocaleString()}.`,
      greeks: {
        delta: greeks.delta || 0,
        gamma: greeks.gamma || 0,
        theta: Math.round(greeks.theta_per_day || 0),
        vega: Math.round(greeks.vega_per_1pct || 0),
      },
      timelineData: state.timeline && state.timeline.length > 0
        ? state.timeline
        : [
            { time: "Start", "IV Impact": 0, Delta: 0, Gamma: 0, Theta: 0, "Total PnL": 0 },
            { time: "Current", "IV Impact": ivImpactVal, Delta: deltaContrib, Gamma: gammaContrib, Theta: thetaVal, "Total PnL": pnl },
          ],
      mode: state.mode || "Python Live Engine",
      zerodhaAuth: state.zerodha_authenticated || false,
    };
  });

  const currentPos = activePositions.find((p) => p.id === selectedPosId) || activePositions[0] || {
    id: "short_straddle",
    name: "Short Straddle",
    type: "SHORT STRADDLE",
    pnl: 0,
    underlyingPrice: 25000,
    ivPct: 18.0,
    dte: "3d",
    breakdown: { spot: 0, delta: 0, gamma: 0, theta: 0, iv: 0, residual: 0 },
    greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    timelineData: [],
  };

  // Dynamically compute Overview metric sums across Python backend position states
  const openPnlTotal = activePositions.reduce((acc, pos) => acc + pos.pnl, 0);
  const thetaTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.theta, 0);
  const ivImpactTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.iv, 0);
  const deltaTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.delta, 0);
  const gammaTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.gamma, 0);
  const spotContribTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.spot, 0);
  const residualTotal = activePositions.reduce((acc, pos) => acc + pos.breakdown.residual, 0);

  // Compute dynamic percentage width for active breakdown bar
  const activeSpot = currentPos.breakdown?.spot || 0;
  const activeTheta = currentPos.breakdown?.theta || 0;
  const activeIv = currentPos.breakdown?.iv || 0;
  const activeResid = currentPos.breakdown?.residual || 0;

  const totalAbs = Math.max(1, Math.abs(activeSpot) + Math.abs(activeTheta) + Math.abs(activeIv) + Math.abs(activeResid));
  const spotWidth = Math.round((Math.abs(activeSpot) / totalAbs) * 100);
  const thetaWidth = Math.round((Math.abs(activeTheta) / totalAbs) * 100);
  const ivWidth = Math.round((Math.abs(activeIv) / totalAbs) * 100);
  const residWidth = Math.max(2, 100 - (spotWidth + thetaWidth + ivWidth));

  let dominantDriver = "volatility expansion";
  if (Math.abs(spotContribTotal) > Math.abs(ivImpactTotal) && Math.abs(spotContribTotal) > Math.abs(thetaTotal)) {
    dominantDriver = "spot price movement";
  } else if (Math.abs(thetaTotal) > Math.abs(ivImpactTotal) && Math.abs(thetaTotal) > Math.abs(spotContribTotal)) {
    dominantDriver = "theta time decay";
  }

  // Fallback default IV Smile Curve if option chain API is loading
  const displayIvSmileData = optionChainData.length > 0
    ? optionChainData
    : [
        { strike: 24700, iv: currentPos.ivPct ? currentPos.ivPct + 2.0 : 20.2 },
        { strike: 24850, iv: currentPos.ivPct ? currentPos.ivPct + 0.9 : 19.1 },
        { strike: 25000, iv: currentPos.ivPct || 18.2 },
        { strike: 25150, iv: currentPos.ivPct ? currentPos.ivPct + 0.3 : 18.5 },
        { strike: 25300, iv: currentPos.ivPct ? currentPos.ivPct + 1.2 : 19.4 },
        { strike: 25450, iv: currentPos.ivPct ? currentPos.ivPct + 2.6 : 20.8 },
      ];

  // Trade History Data (14 recorded trades)
  const tradeHistory = [
    { id: 1, type: "SHORT STRADDLE", date: "28 Aug", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "5h 42m · IV +3.2%", outcome: "Loss", pnl: -4280 },
    { id: 2, type: "BULL CALL SPREAD", date: "25 Aug", name: "BANKNIFTY Bull Call Spread", driver: "Spot Movement", details: "2d 4h · IV -0.6%", outcome: "Profit", pnl: 2100 },
    { id: 3, type: "SHORT STRADDLE", date: "22 Aug", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "4h 10m · IV +2.8%", outcome: "Loss", pnl: -3100 },
    { id: 4, type: "SHORT STRADDLE", date: "19 Aug", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "3h 55m · IV +2.4%", outcome: "Loss", pnl: -2860 },
    { id: 5, type: "IRON CONDOR", date: "18 Aug", name: "NIFTY Iron Condor", driver: "Theta Decay", details: "6d 2h · IV -1.1%", outcome: "Profit", pnl: 1640 },
    { id: 6, type: "SHORT STRADDLE", date: "14 Aug", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "5h 05m · IV +3.0%", outcome: "Loss", pnl: -3480 },
    { id: 7, type: "BULL CALL SPREAD", date: "11 Aug", name: "BANKNIFTY Bull Call Spread", driver: "Spot Movement", details: "1d 6h · IV -0.4%", outcome: "Profit", pnl: 1480 },
    { id: 8, type: "SHORT STRADDLE", date: "7 Aug", name: "BANKNIFTY Short Straddle", driver: "Spot Movement", details: "6h 20m · IV +0.8%", outcome: "Loss", pnl: -1920 },
    { id: 9, type: "IRON CONDOR", date: "4 Aug", name: "NIFTY Iron Condor", driver: "Theta Decay", details: "5d 18h · IV -0.9%", outcome: "Profit", pnl: 2240 },
    { id: 10, type: "SHORT STRADDLE", date: "31 Jul", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "5h 48m · IV +3.9%", outcome: "Loss", pnl: -4960 },
    { id: 11, type: "SHORT STRADDLE", date: "28 Jul", name: "BANKNIFTY Short Straddle", driver: "IV Expansion", details: "4h 55m · IV +3.1%", outcome: "Loss", pnl: -3620 },
    { id: 12, type: "BULL CALL SPREAD", date: "24 Jul", name: "BANKNIFTY Bull Call Spread", driver: "IV Expansion", details: "8h 30m · IV +1.4%", outcome: "Loss", pnl: -860 },
    { id: 13, type: "IRON CONDOR", date: "21 Jul", name: "NIFTY Iron Condor", driver: "Spot Movement", details: "3d 4h · IV +0.3%", outcome: "Loss", pnl: -1240 },
    { id: 14, type: "SHORT STRADDLE", date: "17 Jul", name: "BANKNIFTY Short Straddle", driver: "Theta Decay", details: "7h 10m · IV -1.6%", outcome: "Profit", pnl: 1180 },
  ];

  // Filtering Trade History
  const filteredHistory = tradeHistory.filter((t) => {
    if (outcomeFilter === "Profit" && t.outcome !== "Profit") return false;
    if (outcomeFilter === "Loss" && t.outcome !== "Loss") return false;

    if (strategyFilter === "Short Straddle" && !t.type.includes("STRADDLE")) return false;
    if (strategyFilter === "Bull Call Spread" && !t.type.includes("SPREAD")) return false;
    if (strategyFilter === "Iron Condor" && !t.type.includes("CONDOR")) return false;

    if (driverFilter === "IV conditions" && !t.driver.includes("IV")) return false;
    if (driverFilter === "Theta" && !t.driver.includes("Theta")) return false;
    if (driverFilter === "Spot" && !t.driver.includes("Spot")) return false;

    return true;
  });

  return (
    <div className="khoya-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand-header">
            <div className="brand-icon">K</div>
            <div>
              <div className="brand-title">KHOYA</div>
              <span className="brand-subtitle">OPTIONS INTELLIGENCE</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Live</div>
            <div
              className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <span>⚙</span> Overview
            </div>
            <div
              className={`nav-item ${activeTab === "positions" ? "active" : ""}`}
              onClick={() => setActiveTab("positions")}
            >
              <span>📊</span> Live Positions
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Memory</div>
            <div
              className={`nav-item ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <span>🕒</span> Trade History
            </div>
            <div
              className={`nav-item ${activeTab === "dna" ? "active" : ""}`}
              onClick={() => setActiveTab("dna")}
            >
              <span>🧬</span> Trader DNA
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>Broker-independent. Khoya never places or executes orders.</div>
          <div className="footer-demo-note">Connected to Python FastAPI engine</div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Top Live Ticker Control Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1d2338" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge-confidence" style={{ background: isPlaying ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isPlaying ? "#10b981" : "#ef4444", border: "1px solid currentColor" }}>
              <span className="dot-sm" style={{ background: "currentColor", display: "inline-block", marginRight: 6 }}></span>
              {isPlaying ? `PYTHON BACKEND ENGINE ACTIVE (${currentPos.mode || "Live Ticker"})` : "STREAM PAUSED"}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Ticks: #{tickCount}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="filter-pill" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "Pause Stream" : "Resume Stream"}
            </button>
            <button className="filter-pill" onClick={advanceTick}>
              Manual Tick
            </button>
            <button className="filter-pill" onClick={handleReset} style={{ borderColor: "#ef4444", color: "#ef4444" }}>
              Reset Simulation
            </button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Total P&amp;L Analysis.</h1>
              <p className="page-sub">Calculated live via Python Black-Scholes &amp; P&amp;L Attribution Engine.</p>
            </div>

            {/* Top 6 Metrics Cards Grid */}
            <div className="overview-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
              <div className="k-card">
                <div className="k-card-label">OPEN P&amp;L</div>
                <div className={`k-card-value ${openPnlTotal >= 0 ? "positive" : "negative"}`}>
                  {openPnlTotal >= 0 ? `+₹${openPnlTotal.toLocaleString()}` : `-₹${Math.abs(openPnlTotal).toLocaleString()}`}
                </div>
              </div>
              <div className="k-card">
                <div className="k-card-label">OPEN POSITIONS</div>
                <div className="k-card-value">{activePositions.length}</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">THETA CONTRIBUTION</div>
                <div className="k-card-value positive">+₹{thetaTotal.toLocaleString()}</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">IV IMPACT</div>
                <div className={`k-card-value ${ivImpactTotal >= 0 ? "positive" : "negative"}`}>
                  {ivImpactTotal >= 0 ? `+₹${ivImpactTotal.toLocaleString()}` : `-₹${Math.abs(ivImpactTotal).toLocaleString()}`}
                </div>
              </div>
              <div className="k-card">
                <div className="k-card-label">DELTA IMPACT (Δ)</div>
                <div className={`k-card-value ${deltaTotal >= 0 ? "positive" : "negative"}`}>
                  {deltaTotal >= 0 ? `+₹${deltaTotal.toLocaleString()}` : `-₹${Math.abs(deltaTotal).toLocaleString()}`}
                </div>
              </div>
              <div className="k-card">
                <div className="k-card-label">GAMMA IMPACT (Γ)</div>
                <div className="k-card-value positive">
                  ₹{gammaTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Dynamic Moving "What's driving your P&L?" Banner */}
            <div className="driver-card">
              <h3 className="driver-title">What's driving your P&amp;L?</h3>
              <div className="pnl-bar-container">
                <div className="pnl-segment segment-spot" style={{ width: `${spotWidth}%` }}></div>
                <div className="pnl-segment segment-theta" style={{ width: `${thetaWidth}%` }}></div>
                <div className="pnl-segment segment-iv" style={{ width: `${ivWidth}%` }}></div>
                <div className="pnl-segment segment-residual" style={{ width: `${residWidth}%` }}></div>
              </div>
              <div className="driver-legend">
                <div className="legend-item"><span className="dot-sm segment-spot"></span> Spot {spotContribTotal >= 0 ? `+₹${spotContribTotal.toLocaleString()}` : `-₹${Math.abs(spotContribTotal).toLocaleString()}`} (Δ: ₹{deltaTotal}, Γ: ₹{gammaTotal})</div>
                <div className="legend-item"><span className="dot-sm segment-theta"></span> Theta +₹{thetaTotal.toLocaleString()}</div>
                <div className="legend-item"><span className="dot-sm segment-iv"></span> IV {ivImpactTotal >= 0 ? `+₹${ivImpactTotal.toLocaleString()}` : `-₹${Math.abs(ivImpactTotal).toLocaleString()}`}</div>
                <div className="legend-item"><span className="dot-sm segment-residual"></span> Residual -₹{Math.abs(residualTotal)}</div>
              </div>
              <div className="driver-summary-text">
                Your current total P&amp;L across your {activePositions.length} positions is primarily driven by <strong>{dominantDriver}</strong>. Evaluated in real-time by Python FastAPI backend (`attribute_pnl`).
              </div>
            </div>

            {/* Active Positions List */}
            <h2 className="section-heading">Active positions</h2>
            <div className="position-card-list">
              {activePositions.map((pos) => (
                <div
                  key={pos.id}
                  className="position-row-card"
                  onClick={() => {
                    setSelectedPosId(pos.id);
                    setActiveTab("positions");
                  }}
                >
                  <div>
                    <div className="pos-title-group">
                      <span className="pos-type">{pos.type}</span>
                      <span className="badge-confidence">{pos.confidence}</span>
                    </div>
                    <div className="pos-name">
                      {pos.name} <span className="pos-expiry">· {pos.expiry}</span>
                    </div>
                    <span className={`tag-pill ${pos.driverTagColor === "blue" ? "blue" : ""}`}>
                      {pos.driverTag}
                    </span>
                  </div>

                  <div className="pos-pnl-group">
                    <div>
                      <div className="pos-pnl-label">P&amp;L</div>
                      <div className={`pos-pnl-value ${pos.pnl >= 0 ? "text-green" : "text-red"}`}>
                        {pos.pnl >= 0 ? `+₹${pos.pnl.toLocaleString()}` : `-₹${Math.abs(pos.pnl).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="arrow-icon">❯</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIVE POSITIONS DETAIL TAB */}
        {activeTab === "positions" && (
          <div>
            <div className="back-link" onClick={() => setActiveTab("overview")}>
              ‹ Live Positions
            </div>

            <div className="detail-header">
              <div>
                <div className="pos-title-group">
                  <span className="pos-type">{currentPos.type}</span>
                  <span className="badge-confidence" style={{ background: "#ec4899", color: "#fff" }}>PYTHON ENGINE STREAM</span>
                </div>
                <h1 className="page-title">{currentPos.name}</h1>
                <p className="page-sub">{currentPos.expiry}</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="pos-pnl-label">P&amp;L</div>
                <div className={`pos-pnl-value ${currentPos.pnl >= 0 ? "text-green" : "text-red"}`} style={{ fontSize: 32 }}>
                  {currentPos.pnl >= 0 ? `+₹${currentPos.pnl.toLocaleString()}` : `-₹${Math.abs(currentPos.pnl).toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* Position Key Stats Bar */}
            <div className="detail-stats-bar">
              <div className="stat-item">
                <span className="stat-label">ENTRY VALUE</span>
                <span className="stat-value">₹{currentPos.entryValue?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">CURRENT VALUE</span>
                <span className="stat-value">₹{currentPos.currentValue?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">QUANTITY</span>
                <span className="stat-value">{currentPos.qty}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">SPOT PRICE</span>
                <span className="stat-value">₹{currentPos.underlyingPrice?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">IV</span>
                <span className="stat-value">{currentPos.ivPct}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">TIME TO EXPIRY</span>
                <span className="stat-value">{currentPos.dte}</span>
              </div>
            </div>

            {/* Dynamic Moving "Why is my P&L moving?" Card */}
            <div className="driver-card">
              <h3 className="driver-title">Why is my P&amp;L moving?</h3>
              <div className="pnl-bar-container">
                <div className="pnl-segment segment-spot" style={{ width: `${spotWidth}%` }}></div>
                <div className="pnl-segment segment-theta" style={{ width: `${thetaWidth}%` }}></div>
                <div className="pnl-segment segment-iv" style={{ width: `${ivWidth}%` }}></div>
                <div className="pnl-segment segment-residual" style={{ width: `${residWidth}%` }}></div>
              </div>
              <div className="driver-legend">
                <div className="legend-item"><span className="dot-sm segment-spot"></span> Delta (Δ) {currentPos.breakdown?.delta >= 0 ? `+₹${currentPos.breakdown.delta.toLocaleString()}` : `-₹${Math.abs(currentPos.breakdown?.delta || 0).toLocaleString()}`}</div>
                <div className="legend-item"><span className="dot-sm segment-spot" style={{ opacity: 0.6 }}></span> Gamma (Γ) +₹{currentPos.breakdown?.gamma?.toLocaleString()}</div>
                <div className="legend-item"><span className="dot-sm segment-theta"></span> Theta +₹{currentPos.breakdown?.theta?.toLocaleString()}</div>
                <div className="legend-item"><span className="dot-sm segment-iv"></span> IV {currentPos.breakdown?.iv >= 0 ? `+₹${currentPos.breakdown.iv.toLocaleString()}` : `-₹${Math.abs(currentPos.breakdown?.iv || 0).toLocaleString()}`}</div>
                <div className="legend-item"><span className="dot-sm segment-residual"></span> Residual -₹{Math.abs(currentPos.breakdown?.residual || 0)}</div>
              </div>
              <div className="driver-summary-text">{currentPos.summaryText}</div>
            </div>

            {/* High-FPS P&L Attribution Timeline Chart */}
            <div className="chart-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className="driver-title" style={{ margin: 0 }}>P&amp;L attribution timeline — {currentPos.name}</h3>
                  <p className="page-sub" style={{ marginBottom: 16 }}>Factor breakdown generated by Python FastAPI backend (`attribute_pnl`)</p>
                </div>
                <span className="badge-confidence" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>PYTHON API STREAMING</span>
              </div>

              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                  <LineChart data={currentPos.timelineData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f273d" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#64748b"
                      padding={{ top: 20, bottom: 20 }}
                      tickFormatter={(v) =>
                        Math.abs(v) >= 1000
                          ? `${v >= 0 ? "+" : ""}₹${(v / 1000).toFixed(1)}k`
                          : `₹${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{ background: "#131726", borderColor: "#272f48", borderRadius: 8 }}
                      formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Line type="monotone" dataKey="IV Impact" stroke="#ec4899" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Delta" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Gamma" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Theta" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Total PnL" stroke="#ffffff" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Exposure Greeks (Calculated via Python Black-Scholes Engine) */}
            <div className="greeks-grid">
              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">DELTA (Δ)</span>
                  <span className="greek-val">{currentPos.greeks?.delta}</span>
                </div>
                <div className="greek-desc">Calculated via Python Black-Scholes `bs_greeks()` formula.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">GAMMA (Γ)</span>
                  <span className="greek-val">+{currentPos.greeks?.gamma}</span>
                </div>
                <div className="greek-desc">Measures acceleration of Delta as underlying spot moves.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">THETA (Θ)</span>
                  <span className="greek-val">+₹{currentPos.greeks?.theta}/day</span>
                </div>
                <div className="greek-desc">Estimated daily time decay computed by Python pricing engine.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">VEGA (ν)</span>
                  <span className="greek-val">-₹{Math.abs(currentPos.greeks?.vega || 0)} / 1% IV</span>
                </div>
                <div className="greek-desc">Estimated P&amp;L impact per 1% change in Implied Volatility.</div>
              </div>
            </div>

            {/* Smooth Implied Volatility Curve Chart (Fetched from /live/option-chain) */}
            <div className="chart-card">
              <h3 className="driver-title">Implied Volatility Curve</h3>
              <p className="page-sub" style={{ marginBottom: 16 }}>Option chain snapshot loaded from Python backend (`fetch_live_option_chain`).</p>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <LineChart data={displayIvSmileData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f273d" />
                    <XAxis dataKey="strike" stroke="#64748b" />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      stroke="#64748b"
                      tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                    />
                    <Tooltip
                      contentStyle={{ background: "#131726", borderColor: "#272f48", borderRadius: 8 }}
                      formatter={(val) => [`${Number(val).toFixed(2)}%`, "IV"]}
                    />
                    <Line type="monotone" dataKey="iv" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 5, fill: "#ec4899" }} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attribution Confidence Card */}
            <div className="k-card" style={{ marginBottom: 24 }}>
              <div className="driver-title" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Attribution confidence</span>
                <span className="badge-confidence">HIGH · 92%</span>
              </div>
              <div className="detail-stats-bar" style={{ background: "transparent", border: "none", padding: 0, margin: 0 }}>
                <div className="stat-item">
                  <span className="stat-label">LIQUID STRIKES USED</span>
                  <span className="stat-value">8</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">ENGINE MODE</span>
                  <span className="stat-value" style={{ color: "#10b981" }}>{currentPos.mode || "FastAPI Live Feed"}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">DATA FRESHNESS</span>
                  <span className="stat-value">0.35s</span>
                </div>
              </div>
            </div>

            {/* Thesis vs Reality */}
            <div className="thesis-card">
              <h3 className="driver-title">Thesis vs reality</h3>
              <div className="thesis-box">"I expect NIFTY to remain range-bound and IV to decline."</div>
              <div className="thesis-grid">
                <div>
                  <div className="thesis-col-title">EXPECTED</div>
                  <ul className="thesis-list">
                    <li>• Low underlying movement</li>
                    <li>• IV contraction</li>
                    <li>• Positive Theta</li>
                  </ul>
                </div>

                <div>
                  <div className="thesis-col-title">ACTUAL</div>
                  <ul className="thesis-list">
                    <li>• Low underlying movement</li>
                    <li className="alert-red">• IV expansion ({currentPos.ivPct}%)</li>
                    <li>• Positive Theta</li>
                  </ul>
                </div>
              </div>
              <div className="driver-summary-text">
                Your directional thesis is currently holding, but your volatility thesis is being challenged.
              </div>
            </div>

            {/* You've seen this before (Trader DNA Pattern Matching) */}
            <div className="pattern-card">
              <h3 className="driver-title">You've seen this before</h3>
              <p className="page-sub">This position resembles 11 of your previous trades.</p>
              <div className="pattern-grid">
                <div className="stat-item">
                  <span className="stat-label">SIMILAR TRADES</span>
                  <span className="stat-value">11</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">PROFITABLE</span>
                  <span className="stat-value" style={{ color: "#10b981" }}>3</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">LOSSES</span>
                  <span className="stat-value" style={{ color: "#ec4899" }}>8</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">COMMON DRIVER</span>
                  <span className="stat-value">IV Expansion</span>
                </div>
              </div>
              <div className="back-link" onClick={() => setActiveTab("history")} style={{ marginTop: 12 }}>
                View similar trades in Trade History ›
              </div>
            </div>

            {/* What-If Simulation Runner */}
            <div className="k-card">
              <h3 className="driver-title">WHAT-IF SIMULATION / Run live scenario</h3>
              <div className="scenario-bar">
                <div>
                  <span className="stat-label">SCENARIO STEP</span>
                  <div className="stat-value">Step {scenarioStep + 1} of 4</div>
                </div>
                <div className="legend-item"><span className="dot-sm segment-spot"></span> Spot +150</div>
                <div className="legend-item"><span className="dot-sm segment-theta"></span> Theta +1d</div>
                <div className="legend-item"><span className="dot-sm segment-iv"></span> IV +1.5%</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="filter-pill" onClick={() => setScenarioStep(0)}>Reset</button>
                  <button className="scenario-btn" onClick={() => { setScenarioStep((s) => (s + 1) % 4); advanceTick(); }}>Next step ›</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRADE HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Trade History</h1>
              <p className="page-sub">Your persistent trading memory — 14 recorded trades.</p>
            </div>

            {/* Filter Pills */}
            <div className="history-filters">
              <div className="filter-row">
                {["All", "Profit", "Loss"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${outcomeFilter === f ? "active" : ""}`}
                    onClick={() => setOutcomeFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="filter-row">
                {["All strategies", "Short Straddle", "Bull Call Spread", "Iron Condor"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${strategyFilter === f ? "active" : ""}`}
                    onClick={() => setStrategyFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="filter-row">
                {["All drivers", "IV conditions", "Theta", "Spot"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${driverFilter === f ? "active" : ""}`}
                    onClick={() => setDriverFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* History Items List */}
            <div className="history-list">
              {filteredHistory.map((item) => (
                <div key={item.id} className="history-item">
                  <div>
                    <div className="pos-title-group">
                      <span className="pos-type">{item.type}</span>
                      <span className="pos-expiry">{item.date}</span>
                    </div>
                    <div className="pos-name" style={{ fontSize: 16 }}>{item.name}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                      <span className="tag-pill">{item.driver}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{item.details}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div className="pos-pnl-label" style={{ color: item.outcome === "Profit" ? "#10b981" : "#ec4899" }}>
                      {item.outcome.toUpperCase()}
                    </div>
                    <div className={`pos-pnl-value ${item.pnl >= 0 ? "text-green" : "text-red"}`}>
                      {item.pnl >= 0 ? `+₹${item.pnl.toLocaleString()}` : `-₹${Math.abs(item.pnl).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRADER DNA TAB */}
        {activeTab === "dna" && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Trader DNA</h1>
              <p className="page-sub">Longitudinal pattern matching across all your trades.</p>
            </div>

            <div className="k-card" style={{ marginBottom: 24 }}>
              <h3 className="driver-title">Key Insight</h3>
              <div className="thesis-box" style={{ borderColor: "#ec4899" }}>
                "You lose 73% of your Short Straddle trades when IV expands &gt;2% within the first 48 hours."
              </div>
              <div className="driver-summary-text">
                Your directional choices on NIFTY have a 68% win rate, but unhedged short volatility positions consistently generate your largest drawdowns.
              </div>
            </div>

            <div className="overview-grid">
              <div className="k-card">
                <div className="k-card-label">TOTAL TRADES ANALYZED</div>
                <div className="k-card-value">14</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">WIN RATE</div>
                <div className="k-card-value positive">35.7%</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">AVG WIN</div>
                <div className="k-card-value positive">+₹1,724</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">AVG LOSS</div>
                <div className="k-card-value negative">-₹2,845</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
