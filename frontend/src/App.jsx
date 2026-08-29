import { useEffect, useState } from "react";
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

// FR5 (Hour 9-11): minimum visible output. FR10 (Hour 12-24) upgrades this
// from a plain fetch to a WebSocket-driven live update — deliberately not
// built yet, see README "what to extend first".
export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const endpoint = apiBase ? `${apiBase}/replay/straddle` : "/api/replay/straddle";
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <p style={{ color: "#c0392b" }}>
          Couldn't reach the backend ({error}). Is `uvicorn app.main:app` running on :8000?
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.page}>
        <p>Loading replay…</p>
      </div>
    );
  }

  const chartData = data.intervals.map((row) => ({
    label: row.to_timestamp.slice(5, 16),
    Theta: round1(row.theta_contribution),
    "Delta/Gamma": round1(row.delta_gamma_contribution),
    Vega: round1(row.vega_contribution),
    Residual: round1(row.residual),
  }));

  const t = data.totals;
  const theta_pct = pct(t.theta_contribution, t.pnl_change_actual);
  const vega_pct = pct(t.vega_contribution, t.pnl_change_actual);
  const dg_pct = pct(t.delta_gamma_contribution, t.pnl_change_actual);

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Khoya — P&amp;L Attribution</h1>
      <p style={styles.sub}>
        {data.strategy_type.replace("_", " ")} on {data.underlying} — replayed historical snapshots, not a live
        feed.
      </p>

      <div style={styles.summaryCard}>
        <strong>
          This ₹{Math.abs(t.pnl_change_actual).toLocaleString("en-IN", { maximumFractionDigits: 0 })} move was ~
          {theta_pct}% theta, ~{vega_pct}% vega, ~{dg_pct}% delta/gamma.
        </strong>
        <div style={styles.residualNote}>
          Residual: {round1(t.residual)} (₹{Math.abs(t.residual).toFixed(0)}, {data.residual_pct_of_total.toFixed(1)}%
          of total — always shown, never absorbed into the other buckets).
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="Theta" stackId="1" stroke="#8884d8" fill="#8884d8" />
            <Area type="monotone" dataKey="Delta/Gamma" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
            <Area type="monotone" dataKey="Vega" stackId="1" stroke="#ffc658" fill="#ffc658" />
            <Area type="monotone" dataKey="Residual" stackId="1" stroke="#e57373" fill="#e57373" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Actual</th>
            <th>Theta</th>
            <th>Δ/Γ</th>
            <th>Vega</th>
            <th>Residual</th>
          </tr>
        </thead>
        <tbody>
          {data.intervals.map((row, i) => (
            <tr key={i}>
              <td>{row.from_timestamp.slice(5, 16)}</td>
              <td>{row.to_timestamp.slice(5, 16)}</td>
              <td>{round1(row.pnl_change_actual)}</td>
              <td>{round1(row.theta_contribution)}</td>
              <td>{round1(row.delta_gamma_contribution)}</td>
              <td>{round1(row.vega_contribution)}</td>
              <td>{round1(row.residual)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2}>TOTAL</td>
            <td>{round1(t.pnl_change_actual)}</td>
            <td>{round1(t.theta_contribution)}</td>
            <td>{round1(t.delta_gamma_contribution)}</td>
            <td>{round1(t.vega_contribution)}</td>
            <td>{round1(t.residual)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

const styles = {
  page: { fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "40px auto", padding: "0 16px" },
  h1: { marginBottom: 4 },
  sub: { color: "#666", marginTop: 0 },
  summaryCard: {
    background: "#f5f5f7",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "12px 16px",
    margin: "16px 0",
  },
  residualNote: { color: "#666", fontSize: 13, marginTop: 6 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: 14 },
};
