import { useEffect, useState } from "react";
import BreakdownTable from "./components/BreakdownTable.jsx";

const API_BASE = "http://localhost:8000";

// FR5: "minimum visible output" — this is deliberately a bare fetch + table,
// no state management library, no charts. Goal is to point at numbers, not
// to look finished. Polished frontend (stacked area chart, ledger) is FR
// explicitly out of scope until after Review 1.
export default function App() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/replay/straddle`)
      .then((res) => res.json())
      .then((data) => setRows(data.rows))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h2>Straddle P&L Attribution — Replay</h2>
      <p>Long ATM straddle, 5 snapshots. Theta vs. Vega vs. Delta/Gamma bleed, residual always shown.</p>

      {error && <p style={{ color: "crimson" }}>Backend not reachable: {error}</p>}
      {!rows && !error && <p>Loading replay...</p>}
      {rows && <BreakdownTable rows={rows} />}
    </div>
  );
}
