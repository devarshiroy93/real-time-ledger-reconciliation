// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { getFindings, Finding } from "../services/findingsApi";
import TransactionDrilldown from "../components/TransactionDrillDown";

export default function DashboardPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getFindings();
        setFindings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const counts = {
    matched: findings.filter((f) => f.category.includes("MATCHED")).length,
    mismatched: findings.filter((f) => f.category.includes("MISMATCH")).length,
    pending: findings.filter((f) => f.category.includes("PENDING")).length,
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <SummaryCard
          label="Matched ✅"
          value={counts.matched}
          color="bg-green-100 text-green-800"
        />
        <SummaryCard
          label="Mismatched ❌"
          value={counts.mismatched}
          color="bg-red-100 text-red-800"
        />
        <SummaryCard
          label="Pending ⏳"
          value={counts.pending}
          color="bg-yellow-100 text-yellow-800"
        />
      </div>

      {/* Findings Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                TxId
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                Category
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                Updated At
              </th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr
                key={f.txId}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedTx === f.txId ? "bg-gray-50" : ""
                }`}
                onClick={() =>
                  setSelectedTx(selectedTx === f.txId ? null : f.txId)
                }
              >
                <td className="px-4 py-2 text-sm">{f.txId}</td>
                <td className="px-4 py-2 text-sm">
                  {f.category}
                  {f.category.includes("MISMATCH") && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">
                      {f.details}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {new Date(f.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drill-down view */}
      {selectedTx && (
        <TransactionDrilldown
          txId={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-lg shadow ${color}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
