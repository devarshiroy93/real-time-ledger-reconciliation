import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import HowToUse from "./pages/HowToUse";
import DashboardPage from "./pages/Dashboard";
export default function App() {
    return (_jsx(Router, { children: _jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx(Header, {}), _jsx("main", { className: "flex-grow", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/how-to-use", element: _jsx(HowToUse, {}) })] }) }), _jsx(Footer, {})] }) }));
}
