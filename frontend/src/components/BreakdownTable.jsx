// Deliberately a plain <table>, not a Recharts stacked bar — FR5 only
// requires *a* visible breakdown, and a table is faster to get correct
// under time pressure than debugging a chart library at Hour 10.
// Swap this for Recharts post-review once the polished frontend phase starts.
export default function BreakdownTable({ rows }) {
  const cols = [
    ["interval", "Interval"],
    ["spot", "Spot"],
    ["iv", "IV"],
    ["theta_pnl", "Theta P&L"],
    ["delta_gamma_pnl", "Delta/Gamma P&L"],
    ["vega_pnl", "Vega P&L"],
    ["residual", "Residual"],
    ["actual_pnl", "Actual P&L"],
    ["identity_ok", "Within tolerance"],
  ];

  return (
    <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {cols.map(([key, label]) => (
            <th key={key}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {cols.map(([key]) => (
              <td key={key}>
                {typeof row[key] === "number" ? row[key].toFixed(4) : String(row[key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
