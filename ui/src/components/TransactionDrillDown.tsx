// src/components/TransactionDrilldown.tsx
import { useEffect, useState } from "react";
import { getAudit, AuditEvent } from "../services/findingsApi";

interface Props {
  txId: string;
  onClose: () => void;
}

export default function TransactionDrilldown({ txId, onClose }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAudit(txId);
        setEvents(data);
      } catch (err: any) {
        setError(err.message || "Failed to load audit trail");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [txId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-2/3 max-h-[80vh] overflow-y-auto p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold mb-4">Transaction {txId}</h2>

        {/* Loader */}
        {loading && <div className="text-gray-600">Loading audit trail...</div>}

        {/* Error */}
        {error && <div className="text-red-600">{error}</div>}

        {/* Events */}
        {!loading && !error && (
          <div className="space-y-4">
            {events.map((e, idx) => (
              <div key={idx} className="border-l-2 border-gray-300 pl-4">
                <div className="text-sm font-semibold">{e.category}</div>
                <div className="text-xs text-gray-500">
                  {new Date(e.eventTimestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-700">{e.details}</div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-gray-500 text-sm">No audit trail found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
