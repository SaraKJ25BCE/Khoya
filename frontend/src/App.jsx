import { useState, useEffect } from "react";
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

  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  // Live Positions Dynamic Multi-Position State
  const [liveMetrics, setLiveMetrics] = useState({
    spot: 25020.5,
    ivPct: 18.2,
    // Position 1: Short Straddle
    pnl1: -4280,
    theta1: 2420,
    ivImpact1: -5930,
    deltaContrib1: -740,
    gammaContrib1: 120,
    spotContrib1: -620,
    entryValue1: 186500,
    currentValue1: 182220,
    greeks1: { delta: -0.18, gamma: 0.0042, theta: 4920, vega: -1240 },

    // Position 2: Bull Call Spread
    pnl2: 2280,
    theta2: -320,
    ivImpact2: -150,
    deltaContrib2: 2650,
    gammaContrib2: 150,
    spotContrib2: 2800,
    entryValue2: 45000,
    currentValue2: 47280,
    greeks2: { delta: 0.42, gamma: 0.0018, theta: -320, vega: 450 },

    // Position 3: Iron Condor
    pnl3: -970,
    theta3: 1150,
    ivImpact3: -2100,
    deltaContrib3: 80,
    gammaContrib3: 40,
    spotContrib3: 120,
    entryValue3: 62000,
    currentValue3: 61030,
    greeks3: { delta: -0.05, gamma: 0.0008, theta: 1150, vega: -820 },
  });

  // Dedicated Dynamic Timeline Arrays for EACH position
  const [timelineData1, setTimelineData1] = useState([
    { time: "09:20", "IV Impact": 0, Delta: 0, Gamma: 0, Theta: 0, "Total PnL": 0 },
    { time: "10:30", "IV Impact": -1200, Delta: 320, Gamma: 80, Theta: 350, "Total PnL": -450 },
    { time: "11:45", "IV Impact": -2800, Delta: 540, Gamma: 110, Theta: 850, "Total PnL": -1300 },
    { time: "13:15", "IV Impact": -4500, Delta: -280, Gamma: 80, Theta: 1400, "Total PnL": -3300 },
    { time: "15:30", "IV Impact": -5930, Delta: -740, Gamma: 120, Theta: 2420, "Total PnL": -4280 },
  ]);

  const [timelineData2, setTimelineData2] = useState([
    { time: "09:20", "IV Impact": 0, Delta: 0, Gamma: 0, Theta: 0, "Total PnL": 0 },
    { time: "10:30", "IV Impact": -40, Delta: 850, Gamma: 50, Theta: -80, "Total PnL": 780 },
    { time: "11:45", "IV Impact": -90, Delta: 1620, Gamma: 90, Theta: -180, "Total PnL": 1440 },
    { time: "13:15", "IV Impact": -120, Delta: 2100, Gamma: 120, Theta: -250, "Total PnL": 1850 },
    { time: "15:30", "IV Impact": -150, Delta: 2650, Gamma: 150, Theta: -320, "Total PnL": 2280 },
  ]);

  const [timelineData3, setTimelineData3] = useState([
    { time: "09:20", "IV Impact": 0, Delta: 0, Gamma: 0, Theta: 0, "Total PnL": 0 },
    { time: "10:30", "IV Impact": -520, Delta: 30, Gamma: 10, Theta: 280, "Total PnL": -200 },
    { time: "11:45", "IV Impact": -1100, Delta: 50, Gamma: 20, Theta: 580, "Total PnL": -450 },
    { time: "13:15", "IV Impact": -1650, Delta: 70, Gamma: 30, Theta: 870, "Total PnL": -680 },
    { time: "15:30", "IV Impact": -2100, Delta: 80, Gamma: 40, Theta: 1150, "Total PnL": -970 },
  ]);

  // Dynamic IV Curve Data
  const [ivSmileData, setIvSmileData] = useState([
    { strike: 24700, iv: 20.2 },
    { strike: 24850, iv: 19.1 },
    { strike: 25000, iv: 18.2 },
    { strike: 25150, iv: 18.5 },
    { strike: 25300, iv: 19.4 },
    { strike: 25450, iv: 20.8 },
  ]);

  // High-FPS Multi-Position Tick Advance
  const advanceTick = () => {
    const endpoint = apiBase
      ? `${apiBase}/live/tick?trade_id=${selectedPosId}`
      : `/api/live/tick?trade_id=${selectedPosId}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && data.spot) {
          simulateMultiPositionTick(data.spot, data.iv_pct, data.mtm_pnl);
        } else {
          simulateMultiPositionTick();
        }
      })
      .catch(() => {
        simulateMultiPositionTick();
      });

    setTickCount((c) => c + 1);
  };

  const simulateMultiPositionTick = (apiSpot = null, apiIv = null, apiPnl = null) => {
    const dSpot = (Math.random() - 0.49) * 8.0;
    const dIv = (Math.random() - 0.49) * 0.08;

    setLiveMetrics((prev) => {
      const newSpot = apiSpot ? apiSpot : Math.round((prev.spot + dSpot) * 10) / 10;
      const newIvPct = apiIv ? apiIv : Math.max(10.0, Math.round((prev.ivPct + dIv) * 100) / 100);

      // Pos 1 movement (Short Straddle)
      const newPnl1 = apiPnl ? apiPnl : Math.round(prev.pnl1 + dSpot * 7.2 + dIv * -110);
      const newDelta1 = Math.round(prev.deltaContrib1 + dSpot * 12);
      const newGamma1 = Math.round(prev.gammaContrib1 + dSpot * dSpot * 0.2);
      const newSpotContrib1 = newDelta1 + newGamma1;
      const newIvImpact1 = Math.round(prev.ivImpact1 + dIv * -240);
      const newTheta1 = prev.theta1 + 2;

      // Pos 2 movement (Bull Call Spread - profits from spot up)
      const newPnl2 = Math.round(prev.pnl2 + dSpot * 14.5 + dIv * 12);
      const newDelta2 = Math.round(prev.deltaContrib2 + dSpot * 15);
      const newGamma2 = Math.round(prev.gammaContrib2 + 2);
      const newSpotContrib2 = newDelta2 + newGamma2;
      const newIvImpact2 = Math.round(prev.ivImpact2 + dIv * 18);
      const newTheta2 = prev.theta2 - 1;

      // Pos 3 movement (Iron Condor - rangebound theta decay)
      const newPnl3 = Math.round(prev.pnl3 - Math.abs(dSpot) * 3.2 + dIv * -75);
      const newDelta3 = Math.round(prev.deltaContrib3 + dSpot * 3);
      const newGamma3 = Math.round(prev.gammaContrib3 + 1);
      const newSpotContrib3 = newDelta3 + newGamma3;
      const newIvImpact3 = Math.round(prev.ivImpact3 + dIv * -150);
      const newTheta3 = prev.theta3 + 2;

      const nowStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

      // Update Position 1 Timeline
      setTimelineData1((tPrev) => {
        const last = tPrev[tPrev.length - 1] || { "IV Impact": -5930, Delta: -740, Gamma: 120, Theta: 2420, "Total PnL": -4280 };
        const next = [
          ...tPrev,
          {
            time: nowStr,
            "IV Impact": newIvImpact1,
            Delta: newDelta1,
            Gamma: newGamma1,
            Theta: newTheta1,
            "Total PnL": newPnl1,
          },
        ];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });

      // Update Position 2 Timeline
      setTimelineData2((tPrev) => {
        const next = [
          ...tPrev,
          {
            time: nowStr,
            "IV Impact": newIvImpact2,
            Delta: newDelta2,
            Gamma: newGamma2,
            Theta: newTheta2,
            "Total PnL": newPnl2,
          },
        ];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });

      // Update Position 3 Timeline
      setTimelineData3((tPrev) => {
        const next = [
          ...tPrev,
          {
            time: nowStr,
            "IV Impact": newIvImpact3,
            Delta: newDelta3,
            Gamma: newGamma3,
            Theta: newTheta3,
            "Total PnL": newPnl3,
          },
        ];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });

      return {
        ...prev,
        spot: newSpot,
        ivPct: newIvPct,

        pnl1: newPnl1,
        theta1: newTheta1,
        ivImpact1: newIvImpact1,
        deltaContrib1: newDelta1,
        gammaContrib1: newGamma1,
        spotContrib1: newSpotContrib1,
        currentValue1: newSpot * 7.5 + (prev.entryValue1 - 5000),

        pnl2: newPnl2,
        theta2: newTheta2,
        ivImpact2: newIvImpact2,
        deltaContrib2: newDelta2,
        gammaContrib2: newGamma2,
        spotContrib2: newSpotContrib2,
        currentValue2: prev.entryValue2 + newPnl2,

        pnl3: newPnl3,
        theta3: newTheta3,
        ivImpact3: newIvImpact3,
        deltaContrib3: newDelta3,
        gammaContrib3: newGamma3,
        spotContrib3: newSpotContrib3,
        currentValue3: prev.entryValue3 + newPnl3,

        greeks1: {
          ...prev.greeks1,
          delta: Math.round((prev.greeks1.delta + dSpot * 0.001) * 100) / 100,
        },
      };
    });

    // Smoothly flex IV curve points
    setIvSmileData((prev) =>
      prev.map((item) => ({
        ...item,
        iv: Math.max(10, Math.round((item.iv + (Math.random() - 0.5) * 0.06) * 10) / 10),
      }))
    );
  };

  // High FPS Stream Interval (350ms ticks)
  useEffect(() => {
    advanceTick();

    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        advanceTick();
      }, 350);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedPosId]);

  const handleReset = () => {
    setLiveMetrics((prev) => ({
      ...prev,
      pnl1: -4280,
      pnl2: 2280,
      pnl3: -970,
      theta1: 2420,
      theta2: -320,
      theta3: 1150,
      ivImpact1: -5930,
      ivImpact2: -150,
      ivImpact3: -2100,
      deltaContrib1: -740,
      deltaContrib2: 2650,
      deltaContrib3: 80,
      gammaContrib1: 120,
      gammaContrib2: 150,
      gammaContrib3: 40,
      spotContrib1: -620,
      spotContrib2: 2800,
      spotContrib3: 120,
    }));
  };

  // Calculated Live Total Metrics across ALL 3 open positions
  const openPnlTotal = liveMetrics.pnl1 + liveMetrics.pnl2 + liveMetrics.pnl3;
  const thetaTotal = liveMetrics.theta1 + liveMetrics.theta2 + liveMetrics.theta3;
  const ivImpactTotal = liveMetrics.ivImpact1 + liveMetrics.ivImpact2 + liveMetrics.ivImpact3;
  const deltaTotal = liveMetrics.deltaContrib1 + liveMetrics.deltaContrib2 + liveMetrics.deltaContrib3;
  const gammaTotal = liveMetrics.gammaContrib1 + liveMetrics.gammaContrib2 + liveMetrics.gammaContrib3;
  const spotContribTotal = liveMetrics.spotContrib1 + liveMetrics.spotContrib2 + liveMetrics.spotContrib3;
  const residualTotal = -350;

  // Active Positions List
  const activePositions = [
    {
      id: "short_straddle",
      type: "SHORT STRADDLE",
      name: "NIFTY 25000",
      expiry: "24 SEP 2026",
      underlying: "NIFTY 25000",
      confidence: "HIGH · 92%",
      driverTag: "IV Expansion",
      driverTagColor: "pink",
      pnl: liveMetrics.pnl1,
      entryValue: liveMetrics.entryValue1,
      currentValue: liveMetrics.currentValue1,
      qty: -75,
      underlyingPrice: liveMetrics.spot,
      ivPct: liveMetrics.ivPct,
      dte: "3d",
      breakdown: { spot: liveMetrics.spotContrib1, delta: liveMetrics.deltaContrib1, gamma: liveMetrics.gammaContrib1, theta: liveMetrics.theta1, iv: liveMetrics.ivImpact1, residual: -150 },
      summaryText: `IV expansion is currently the dominant contributor to your loss. Theta (+₹${liveMetrics.theta1.toLocaleString()}) is partially offsetting the loss.`,
      greeks: liveMetrics.greeks1,
      timelineData: timelineData1,
    },
    {
      id: "bull_call_spread",
      type: "BULL CALL SPREAD",
      name: "NIFTY 25100 / 25400",
      expiry: "24 SEP 2026",
      underlying: "NIFTY 25100",
      confidence: "HIGH · 88%",
      driverTag: "Spot Movement",
      driverTagColor: "blue",
      pnl: liveMetrics.pnl2,
      entryValue: liveMetrics.entryValue2,
      currentValue: liveMetrics.currentValue2,
      qty: 75,
      underlyingPrice: liveMetrics.spot,
      ivPct: 17.5,
      dte: "3d",
      breakdown: { spot: liveMetrics.spotContrib2, delta: liveMetrics.deltaContrib2, gamma: liveMetrics.gammaContrib2, theta: liveMetrics.theta2, iv: liveMetrics.ivImpact2, residual: -50 },
      summaryText: "Spot price movement is driving your profit as NIFTY advances toward your long call strike.",
      greeks: liveMetrics.greeks2,
      timelineData: timelineData2,
    },
    {
      id: "iron_condor",
      type: "IRON CONDOR",
      name: "BANKNIFTY 51000 / 51500 / 52500 / 53000",
      expiry: "24 SEP 2026",
      underlying: "BANKNIFTY 51500",
      confidence: "MEDIUM · 74%",
      driverTag: "IV Expansion",
      driverTagColor: "pink",
      pnl: liveMetrics.pnl3,
      entryValue: liveMetrics.entryValue3,
      currentValue: liveMetrics.currentValue3,
      qty: -30,
      underlyingPrice: 51850,
      ivPct: 21.4,
      dte: "3d",
      breakdown: { spot: liveMetrics.spotContrib3, delta: liveMetrics.deltaContrib3, gamma: liveMetrics.gammaContrib3, theta: liveMetrics.theta3, iv: liveMetrics.ivImpact3, residual: -140 },
      summaryText: "Volatility expansion across short wing strikes is creating a temporary mark-to-market loss.",
      greeks: liveMetrics.greeks3,
      timelineData: timelineData3,
    },
  ];

  const currentPos = activePositions.find((p) => p.id === selectedPosId) || activePositions[0];

  // Compute dynamic percentage width for active breakdown bar
  const activeSpot = currentPos.breakdown.spot;
  const activeTheta = currentPos.breakdown.theta;
  const activeIv = currentPos.breakdown.iv;
  const activeResid = currentPos.breakdown.residual;

  const totalAbs = Math.max(1, Math.abs(activeSpot) + Math.abs(activeTheta) + Math.abs(activeIv) + Math.abs(activeResid));
  const spotWidth = Math.round((Math.abs(activeSpot) / totalAbs) * 100);
  const thetaWidth = Math.round((Math.abs(activeTheta) / totalAbs) * 100);
  const ivWidth = Math.round((Math.abs(activeIv) / totalAbs) * 100);
  const residWidth = Math.max(2, 100 - (spotWidth + thetaWidth + ivWidth));

  // Dynamic text commentary based on dominant factor
  let dominantDriver = "volatility expansion";
  if (Math.abs(spotContribTotal) > Math.abs(ivImpactTotal) && Math.abs(spotContribTotal) > Math.abs(thetaTotal)) {
    dominantDriver = "spot price movement";
  } else if (Math.abs(thetaTotal) > Math.abs(ivImpactTotal) && Math.abs(thetaTotal) > Math.abs(spotContribTotal)) {
    dominantDriver = "theta time decay";
  }

  // Trade History Data (14 recorded trades)
  const tradeHistory = [
    { id: 1, type: "SHORT STRADDLE", date: "28 Aug", name: "NIFTY 25000", driver: "IV Expansion", details: "5h 42m · IV +3.2%", outcome: "Loss", pnl: -4280 },
    { id: 2, type: "BULL CALL SPREAD", date: "25 Aug", name: "NIFTY 24900 / 25200", driver: "Spot Movement", details: "2d 4h · IV -0.6%", outcome: "Profit", pnl: 2100 },
    { id: 3, type: "SHORT STRADDLE", date: "22 Aug", name: "NIFTY 24950", driver: "IV Expansion", details: "4h 10m · IV +2.8%", outcome: "Loss", pnl: -3100 },
    { id: 4, type: "SHORT STRADDLE", date: "19 Aug", name: "NIFTY 24800", driver: "IV Expansion", details: "3h 55m · IV +2.4%", outcome: "Loss", pnl: -2860 },
    { id: 5, type: "IRON CONDOR", date: "18 Aug", name: "BANKNIFTY 51000 / 51500 / 52500 / 53000", driver: "Theta Decay", details: "6d 2h · IV -1.1%", outcome: "Profit", pnl: 1640 },
    { id: 6, type: "SHORT STRADDLE", date: "14 Aug", name: "NIFTY 25100", driver: "IV Expansion", details: "5h 05m · IV +3.0%", outcome: "Loss", pnl: -3480 },
    { id: 7, type: "BULL CALL SPREAD", date: "11 Aug", name: "NIFTY 24700 / 25000", driver: "Spot Movement", details: "1d 6h · IV -0.4%", outcome: "Profit", pnl: 1480 },
    { id: 8, type: "SHORT STRADDLE", date: "7 Aug", name: "NIFTY 24900", driver: "Spot Movement", details: "6h 20m · IV +0.8%", outcome: "Loss", pnl: -1920 },
    { id: 9, type: "IRON CONDOR", date: "4 Aug", name: "NIFTY 24600 / 24800 / 25200 / 25400", driver: "Theta Decay", details: "5d 18h · IV -0.9%", outcome: "Profit", pnl: 2240 },
    { id: 10, type: "SHORT STRADDLE", date: "31 Jul", name: "NIFTY 24750", driver: "IV Expansion", details: "5h 48m · IV +3.9%", outcome: "Loss", pnl: -4960 },
    { id: 11, type: "SHORT STRADDLE", date: "28 Jul", name: "NIFTY 24850", driver: "IV Expansion", details: "4h 55m · IV +3.1%", outcome: "Loss", pnl: -3620 },
    { id: 12, type: "BULL CALL SPREAD", date: "24 Jul", name: "BANKNIFTY 51600 / 52000", driver: "IV Expansion", details: "8h 30m · IV +1.4%", outcome: "Loss", pnl: -860 },
    { id: 13, type: "IRON CONDOR", date: "21 Jul", name: "NIFTY 24500 / 24800 / 25300 / 25600", driver: "Spot Movement", details: "3d 4h · IV +0.3%", outcome: "Loss", pnl: -1240 },
    { id: 14, type: "SHORT STRADDLE", date: "17 Jul", name: "NIFTY 24700", driver: "Theta Decay", details: "7h 10m · IV -1.6%", outcome: "Profit", pnl: 1180 },
  ];

  // Filtering Trade History
  const filteredHistory = tradeHistory.filter((t) => {
    if (outcomeFilter === "Profit" && t.outcome !== "Profit") return false;
    if (outcomeFilter === "Loss" && t.outcome !== "Loss") return false;

    if (strategyFilter === "Short Straddle" && t.type !== "SHORT STRADDLE") return false;
    if (strategyFilter === "Bull Call Spread" && t.type !== "BULL CALL SPREAD") return false;
    if (strategyFilter === "Iron Condor" && t.type !== "IRON CONDOR") return false;

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
          <div className="footer-demo-note">Demo data · not investment advice</div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Top Live Ticker Control Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1d2338" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge-confidence" style={{ background: isPlaying ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isPlaying ? "#10b981" : "#ef4444", border: "1px solid currentColor" }}>
              <span className="dot-sm" style={{ background: "currentColor", display: "inline-block", marginRight: 6 }}></span>
              {isPlaying ? "HIGH-FPS LIVE FEED ACTIVE (350ms)" : "STREAM PAUSED"}
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
              <h1 className="page-title">Good morning.</h1>
              <p className="page-sub">Here's what's happening across your positions.</p>
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
                <div className="k-card-value">3</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">THETA CONTRIBUTION</div>
                <div className="k-card-value positive">+₹{thetaTotal.toLocaleString()}</div>
              </div>
              <div className="k-card">
                <div className="k-card-label">IV IMPACT</div>
                <div className="k-card-value negative">
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
                  +₹{gammaTotal.toLocaleString()}
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
                <div className="legend-item"><span className="dot-sm segment-residual"></span> Residual -₹350</div>
              </div>
              <div className="driver-summary-text">
                Your current total P&amp;L is primarily being driven by <strong>{dominantDriver}</strong>. Spot is at <strong>₹{liveMetrics.spot.toLocaleString()}</strong> (IV: <strong>{liveMetrics.ivPct}%</strong>). Delta impact is ₹{deltaTotal} and Gamma acceleration is +₹{gammaTotal}.
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
                  <span className="badge-confidence" style={{ background: "#ec4899", color: "#fff" }}>LIVE TICKER</span>
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
                <span className="stat-value">₹{currentPos.entryValue.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">CURRENT VALUE</span>
                <span className="stat-value">₹{Math.round(currentPos.currentValue).toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">QUANTITY</span>
                <span className="stat-value">{currentPos.qty}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">SPOT PRICE</span>
                <span className="stat-value">₹{currentPos.underlyingPrice.toLocaleString()}</span>
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
                <div className="legend-item"><span className="dot-sm segment-spot"></span> Delta (Δ) {currentPos.breakdown.delta >= 0 ? `+₹${currentPos.breakdown.delta.toLocaleString()}` : `-₹${Math.abs(currentPos.breakdown.delta).toLocaleString()}`}</div>
                <div className="legend-item"><span className="dot-sm segment-spot" style={{ opacity: 0.6 }}></span> Gamma (Γ) +₹{currentPos.breakdown.gamma.toLocaleString()}</div>
                <div className="legend-item"><span className="dot-sm segment-theta"></span> Theta +₹{currentPos.breakdown.theta.toLocaleString()}</div>
                <div className="legend-item"><span className="dot-sm segment-iv"></span> IV {currentPos.breakdown.iv >= 0 ? `+₹${currentPos.breakdown.iv.toLocaleString()}` : `-₹${Math.abs(currentPos.breakdown.iv).toLocaleString()}`}</div>
                <div className="legend-item"><span className="dot-sm segment-residual"></span> Residual -₹{Math.abs(currentPos.breakdown.residual)}</div>
              </div>
              <div className="driver-summary-text">{currentPos.summaryText}</div>
            </div>

            {/* High-FPS P&L Attribution Timeline Chart (FLUCTUATES DYNAMICALLY PER POSITION!) */}
            <div className="chart-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className="driver-title" style={{ margin: 0 }}>P&amp;L attribution timeline — {currentPos.name}</h3>
                  <p className="page-sub" style={{ marginBottom: 16 }}>Live streaming factor breakdown including Delta and Gamma</p>
                </div>
                <span className="badge-confidence" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>HIGH-FPS FEED ACTIVE</span>
              </div>

              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={currentPos.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f273d" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ background: "#131726", borderColor: "#272f48" }} />
                    <Legend />
                    <Line type="monotone" dataKey="IV Impact" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Delta" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Gamma" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Theta" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                    <Line type="monotone" dataKey="Total PnL" stroke="#ffffff" strokeDasharray="5 5" strokeWidth={1.5} dot={false} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Exposure Greeks */}
            <div className="greeks-grid">
              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">DELTA (Δ)</span>
                  <span className="greek-val">{currentPos.greeks.delta}</span>
                </div>
                <div className="greek-desc">A ₹1 move in underlying spot has an estimated delta-driven impact of -₹13.5 per point before gamma effects.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">GAMMA (Γ)</span>
                  <span className="greek-val">+{currentPos.greeks.gamma}</span>
                </div>
                <div className="greek-desc">Measures how quickly Delta itself changes as the spot price moves.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">THETA (Θ)</span>
                  <span className="greek-val">+₹{currentPos.greeks.theta}/day</span>
                </div>
                <div className="greek-desc">Time decay is currently contributing approximately ₹4,920 per day.</div>
              </div>

              <div className="greek-card">
                <div className="greek-header">
                  <span className="greek-title">VEGA (ν)</span>
                  <span className="greek-val">-₹{Math.abs(currentPos.greeks.vega)} / 1% IV</span>
                </div>
                <div className="greek-desc">A 1 percentage point increase in IV currently has an estimated -₹1,240 impact on the position.</div>
              </div>
            </div>

            {/* Smooth Implied Volatility Curve Chart */}
            <div className="chart-card">
              <h3 className="driver-title">Implied Volatility Curve</h3>
              <p className="page-sub" style={{ marginBottom: 16 }}>Volatility estimated across liquid strike prices.</p>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={ivSmileData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f273d" />
                    <XAxis dataKey="strike" stroke="#64748b" />
                    <YAxis domain={[10, 25]} stroke="#64748b" />
                    <Tooltip contentStyle={{ background: "#131726", borderColor: "#272f48" }} />
                    <Line type="monotone" dataKey="iv" stroke="#ec4899" strokeWidth={2} dot={{ r: 4, fill: "#ec4899" }} isAnimationActive={true} animationDuration={300} easing="ease-in-out" />
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
                  <span className="stat-label">DATA QUALITY</span>
                  <span className="stat-value" style={{ color: "#10b981" }}>Good</span>
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
                    <li className="alert-red">• IV expansion ({liveMetrics.ivPct}%)</li>
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
