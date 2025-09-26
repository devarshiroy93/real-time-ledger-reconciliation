import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Timeline({ events }) {
    const getDotColor = (eventType) => {
        if (eventType.toUpperCase().includes("FAILED"))
            return "bg-red-500";
        if (eventType.toUpperCase().includes("PASSED"))
            return "bg-green-500";
        return "bg-blue-500";
    };
    return (_jsx("div", { className: "border-l-2 border-gray-300 pl-4 space-y-4", children: events.map((e, idx) => (_jsxs("div", { className: "relative", children: [_jsx("div", { className: `absolute -left-2.5 top-1 w-3 h-3 rounded-full border border-white mr-1 ${getDotColor(e.eventType)}` }), _jsxs("div", { className: "ml-1", children: [_jsx("div", { className: "text-sm font-semibold", children: e.eventType.replace(/_/g, " ") }), _jsxs("div", { className: "text-xs text-gray-500", children: [new Date(e.timestamp).toLocaleString(), e.actor && ` • ${e.actor}`] })] })] }, idx))) }));
}
