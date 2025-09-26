import { jsx as _jsx } from "react/jsx-runtime";
export default function StatusChip({ status }) {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    let color = "bg-yellow-100 text-yellow-800"; // default = yellow
    if (status.toUpperCase().includes("FAILED")) {
        color = "bg-red-100 text-red-800";
    }
    else if (status.toUpperCase().includes("DISBURSED")) {
        color = "bg-green-100 text-green-800";
    }
    return _jsx("span", { className: `${base} ${color}`, children: status });
}
