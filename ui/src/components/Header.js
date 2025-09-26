import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export default function Header() {
    return (_jsxs("header", { className: "flex justify-between items-center bg-gray-800 text-white px-6 py-3", children: [_jsxs("div", { className: "flex items-center space-x-6", children: [_jsx("h1", { className: "text-lg font-bold", children: "Ledger Reconciliation" }), _jsx(Link, { to: "/applications", className: "hover:underline", children: "My Transactions" }), _jsx(Link, { to: "/how-to-use", className: "hover:underline", children: "How to use" })] }), _jsx("div", { children: _jsxs("select", { className: "text-black rounded px-2 py-1", children: [_jsx("option", { value: "user1", children: "User 1" }), _jsx("option", { value: "user2", children: "User 2" }), _jsx("option", { value: "admin", children: "Admin" })] }) })] }));
}
