import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/TransactionDrilldown.tsx
import { useEffect, useState } from "react";
import { getAudit } from "../services/findingsApi";
export default function TransactionDrilldown({ txId, onClose }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const data = await getAudit(txId);
                setEvents(data);
            }
            catch (err) {
                setError(err.message || "Failed to load audit trail");
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, [txId]);
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg w-2/3 max-h-[80vh] overflow-y-auto p-6 relative", children: [_jsx("button", { onClick: onClose, className: "absolute top-2 right-2 text-gray-600 hover:text-gray-900", children: "\u2715" }), _jsxs("h2", { className: "text-lg font-bold mb-4", children: ["Transaction ", txId] }), loading && _jsx("div", { className: "text-gray-600", children: "Loading audit trail..." }), error && _jsx("div", { className: "text-red-600", children: error }), !loading && !error && (_jsxs("div", { className: "space-y-4", children: [events.map((e, idx) => (_jsxs("div", { className: "border-l-2 border-gray-300 pl-4", children: [_jsx("div", { className: "text-sm font-semibold", children: e.category }), _jsx("div", { className: "text-xs text-gray-500", children: new Date(e.eventTimestamp).toLocaleString() }), _jsx("div", { className: "text-xs text-gray-700", children: e.details })] }, idx))), events.length === 0 && (_jsx("div", { className: "text-gray-500 text-sm", children: "No audit trail found." }))] }))] }) }));
}
