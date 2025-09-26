import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { getFindings } from "../services/findingsApi";
import TransactionDrilldown from "../components/TransactionDrillDown";
export default function DashboardPage() {
    const [findings, setFindings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTx, setSelectedTx] = useState(null);
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await getFindings();
                setFindings(data);
            }
            catch (err) {
                setError(err.message);
            }
            finally {
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
    if (loading)
        return _jsx("div", { className: "p-6", children: "Loading..." });
    if (error)
        return _jsxs("div", { className: "p-6 text-red-600", children: ["Error: ", error] });
    return (_jsxs("div", { className: "p-6 space-y-8", children: [_jsxs("div", { className: "grid grid-cols-3 gap-6", children: [_jsx(SummaryCard, { label: "Matched \u2705", value: counts.matched, color: "bg-green-100 text-green-800" }), _jsx(SummaryCard, { label: "Mismatched \u274C", value: counts.mismatched, color: "bg-red-100 text-red-800" }), _jsx(SummaryCard, { label: "Pending \u23F3", value: counts.pending, color: "bg-yellow-100 text-yellow-800" })] }), _jsx("div", { className: "bg-white shadow rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left text-sm font-semibold text-gray-700", children: "TxId" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-semibold text-gray-700", children: "Category" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-semibold text-gray-700", children: "Updated At" })] }) }), _jsx("tbody", { children: findings.map((f) => (_jsxs("tr", { className: `hover:bg-gray-50 cursor-pointer ${selectedTx === f.txId ? "bg-gray-50" : ""}`, onClick: () => setSelectedTx(selectedTx === f.txId ? null : f.txId), children: [_jsx("td", { className: "px-4 py-2 text-sm", children: f.txId }), _jsxs("td", { className: "px-4 py-2 text-sm", children: [f.category, f.category.includes("MISMATCH") && (_jsx("div", { className: "mt-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block", children: f.details }))] }), _jsx("td", { className: "px-4 py-2 text-sm", children: new Date(f.updatedAt).toLocaleString() })] }, f.txId))) })] }) }), selectedTx && (_jsx(TransactionDrilldown, { txId: selectedTx, onClose: () => setSelectedTx(null) }))] }));
}
function SummaryCard({ label, value, color, }) {
    return (_jsxs("div", { className: `p-4 rounded-lg shadow ${color}`, children: [_jsx("div", { className: "text-sm font-medium", children: label }), _jsx("div", { className: "text-2xl font-bold", children: value })] }));
}
