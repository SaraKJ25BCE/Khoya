import { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function App() {
  const [sampleTrades, setSampleTrades] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState("short_straddle");
  const [liveData, setLiveData] = useState(null);
  const [optionChain, setOptionChain] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState(null);

  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const intervalRef = useRef(null);

  // Fetch list of sample open trades on load
  useEffect(() => {
    const endpoint = apiBase ? `${apiBase}/sample-trades` : "/api/sample-trades";
    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSampleTrades(data);
      })
      .catch((err) => {
        console.warn("Falling back to local sample trade list:", err.message);
        setSampleTrades([
          { id: "short_straddle", name: "BANKNIFTY Short Straddle", underlying: "BANKNIFTY" },
          { id: "iron_condor", name: "NIFTY Iron Condor", underlying: "NIFTY" },
          { id: "bull_call_spread", name: "BANKNIFTY Bull Call Spread", underlying: "BANKNIFTY" },
        ]);
      });
  }, [apiBase]);

  // Fetch live tick
  const fetchTick = (tradeId = selectedTradeId) => {
    const endpoint = apiBase
      ? `${apiBase}/live/tick?trade_id=${tradeId}`
      : `/api/live/tick?trade_id=${tradeId}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setLiveData(data);
        setError(null);
      })
      .catch((e) => setError(e.message));
  };

  // Fetch live option chain
  const fetchOptionChain = (underlying = "NIFTY") => {
    const endpoint = apiBase
      ? `${apiBase}/live/option-chain?underlying=${underlying}`
      : `/api/live/option-chain?underlying=${underlying}`;

    fetch(endpoint)
      .then((res) => res.json())
      .then(setOptionChain)
      .catch((err) => console.error("Option chain fetch error:", err));
  };

  // Live simulation ticker interval (ticks every 3 seconds when playing)
  useEffect(() => {
    fetchTick(selectedTradeId);
    fetchOptionChain(selectedTradeId.includes("nifty") ? "NIFTY" : "BANKNIFTY");

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        fetchTick(selectedTradeId);
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, selectedTradeId]);

  const handleReset = () => {
    const endpoint = apiBase
      ? `${apiBase}/live/reset?trade_id=${selectedTradeId}`
      : `/api/live/reset?trade_id=${selectedTradeId}`;

    fetch(endpoint, { method: "POST" })
      .then(() => fetchTick(selectedTradeId))
      .catch((err) => console.error("Reset error:", err));
  };

  if (error && !liveData) {
    return (
      <div className="container center-screen">
        <div className="card error-card">
          <h2>Backend Unreachable</h2>
          <p>Couldn't connect to Khoya backend ({error}).</p>
          <p>Please ensure the FastAPI service (`uvicorn app.main:app`) is running.</p>
        </div>
      </div>
    );
  }

  const chartData = liveData?.intervals?.map((row) => ({
    label: row.to_timestamp ? row.to_timestamp.slice(11, 19) : `Step ${row.step}`,
    Theta: round1(row.theta_contribution),
    "Delta/Gamma": round1(row.delta_gamma_contribution),
    Vega: round1(row.vega_contribution),
    Residual: round1(row.residual),
  })) || [];

  const t = liveData?.totals || {
    theta_contribution: 0,
    delta_gamma_contribution: 0,
    vega_contribution: 0,
    residual: 0,
    pnl_change_actual: 0,
  };

  const theta_pct = pct(t.theta_contribution, t.pnl_change_actual);
  const vega_pct = pct(t.vega_contribution, t.pnl_change_actual);
  const dg_pct = pct(t.delta_gamma_contribution, t.pnl_change_actual);

  const mtmClass = (liveData?.mtm_pnl || 0) >= 0 ? "text-green" : "text-red";

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Khoya</h1>
          <span className="subtitle">Live Options P&amp;L Attribution &amp; Simulation</span>
        </div>
        <div className="header-right">
          <span className={`status-badge ${liveData?.zerodha_authenticated ? "status-kite" : "status-sim"}`}>
            <span className="dot"></span>
            {liveData?.mode || "Live Simulation Active"}
          </span>

          <button className="btn btn-secondary" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? "Pause Stream" : "Resume Stream"}
          </button>
          <button className="btn btn-outline" onClick={() => fetchTick(selectedTradeId)}>
            Manual Tick
          </button>
          <button className="btn btn-danger" onClick={handleReset}>
            Reset
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Sample Open Trades Selector */}
        <div className="card strategy-card">
          <h3>Sample Open Trades</h3>
          <p className="hint">
            Active broker account has 0 positions. Select a sample trade below to run real-time Kite Connect calculation &amp; live market simulation:
          </p>
          <div className="strategy-buttons">
            {sampleTrades.map((st) => (
              <button
                key={st.id}
                className={`strategy-btn ${selectedTradeId === st.id ? "active" : ""}`}
                onClick={() => setSelectedTradeId(st.id)}
              >
                <div className="st-name">{st.name}</div>
                <div className="st-sub">{st.underlying} • {st.strategy_type?.replace("_", " ")}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Cards */}
        {liveData && (
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-label">Live Spot Price ({liveData.underlying})</span>
              <span className="metric-value font-mono">₹{liveData.spot?.toLocaleString("en-IN")}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Implied Volatility (IV)</span>
              <span className="metric-value font-mono">{liveData.iv_pct}%</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Mark-to-Market P&amp;L</span>
              <span className={`metric-value font-mono ${mtmClass}`}>
                ₹{liveData.mtm_pnl >= 0 ? `+${liveData.mtm_pnl}` : liveData.mtm_pnl}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Days To Expiry (DTE)</span>
              <span className="metric-value font-mono">{liveData.days_to_expiry} days</span>
            </div>
          </div>
        )}

        {/* Real-time Greeks Row */}
        {liveData?.current_greeks && (
          <div className="greeks-row">
            <div className="greek-pill">Delta: <strong>{liveData.current_greeks.delta}</strong></div>
            <div className="greek-pill">Gamma: <strong>{liveData.current_greeks.gamma}</strong></div>
            <div className="greek-pill">Theta / Day: <strong>₹{liveData.current_greeks.theta_per_day}</strong></div>
            <div className="greek-pill">Vega / 1% IV: <strong>₹{liveData.current_greeks.vega_per_1pct}</strong></div>
          </div>
        )}

        {/* Real-time Attribution Summary Banner */}
        {liveData && (
          <div className="summary-banner">
            <div className="summary-title">
              Live P&amp;L Breakdown Summary:
            </div>
            <div className="summary-body">
              This <strong>₹{Math.abs(t.pnl_change_actual).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> move was ~
              <span className="highlight theta">{theta_pct}% Theta</span>, ~
              <span className="highlight vega">{vega_pct}% Vega</span>, ~
              <span className="highlight delta">{dg_pct}% Delta/Gamma</span>.
            </div>
            <div className="residual-tag">
              Unexplained Residual: <strong>₹{Math.abs(t.residual).toFixed(0)}</strong> ({liveData.residual_pct_of_total}% of total — explicit bucket).
            </div>
          </div>
        )}

        {/* Live Attribution Area Chart */}
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Real-Time Cumulative P&amp;L Attribution Breakdown</h3>
            <span className="chart-sub">Theta vs Delta/Gamma vs Vega vs Residual Over Time</span>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                <XAxis dataKey="label" stroke="#88909d" />
                <YAxis stroke="#88909d" />
                <Tooltip contentStyle={{ backgroundColor: "#1e222d", borderColor: "#363c4e", color: "#fff" }} />
                <Legend />
                <Area type="monotone" dataKey="Theta" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                <Area type="monotone" dataKey="Delta/Gamma" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="Vega" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="Residual" stackId="1" stroke="#ef4444" fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sample Open Trade Legs Table */}
        <div className="card table-card">
          <h3>Open Strategy Position Legs ({liveData?.trade_name})</h3>
          <table className="styled-table">
            <thead>
              <tr>
                <th>Leg #</th>
                <th>Option Type</th>
                <th>Strike Price</th>
                <th>Position Side</th>
                <th>Quantity</th>
                <th>Entry Premium</th>
              </tr>
            </thead>
            <tbody>
              {liveData?.legs?.map((leg, i) => (
                <tr key={i}>
                  <td>Leg {i + 1}</td>
                  <td>
                    <span className={`badge ${leg.option_type === "call" ? "badge-call" : "badge-put"}`}>
                      {leg.option_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="font-mono">₹{leg.strike}</td>
                  <td>
                    <span className={`badge ${leg.qty < 0 ? "badge-short" : "badge-long"}`}>
                      {leg.qty < 0 ? "SHORT" : "LONG"}
                    </span>
                  </td>
                  <td className="font-mono">{Math.abs(leg.qty)}</td>
                  <td className="font-mono">₹{leg.entry_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Option Chain Data Feed */}
        {optionChain && (
          <div className="card table-card">
            <h3>Kite Connect Live Option Chain Data Feed ({optionChain.underlying})</h3>
            <span className="hint">Source: {optionChain.source} • Last Refreshed: {optionChain.timestamp || "Now"}</span>
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Call IV %</th>
                  <th>Call Price (CE)</th>
                  <th>Strike Price</th>
                  <th>Put Price (PE)</th>
                  <th>Put IV %</th>
                </tr>
              </thead>
              <tbody>
                {optionChain.chain?.map((row, i) => (
                  <tr key={i} className={row.strike_price === liveData?.spot ? "highlight-strike" : ""}>
                    <td className="font-mono text-purple">{row.call_iv}%</td>
                    <td className="font-mono text-green">₹{row.call_ltp}</td>
                    <td className="font-mono bold">₹{row.strike_price}</td>
                    <td className="font-mono text-red">₹{row.put_ltp}</td>
                    <td className="font-mono text-purple">{row.put_iv}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function round1(n) {
  return Math.round((n || 0) * 10) / 10;
}
function pct(part, whole) {
  return whole ? Math.round(((part || 0) / whole) * 100) : 0;
}
