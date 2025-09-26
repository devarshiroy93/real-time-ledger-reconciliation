import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { submitTransaction } from "../services/findingsApi";
export default function SubmitApplication() {
    const [amount, setAmount] = useState(0);
    const [purpose, setPurpose] = useState("");
    const [status, setStatus] = useState(null);
    const userId = import.meta.env.VITE_USER_ID;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("Submitting...");
        try {
            const result = await submitTransaction(`tx-${Date.now()}`, amount);
            setStatus(`Transaction submitted!`);
        }
        catch (err) {
            if (err instanceof Error) {
                setStatus(` Error: ${err.message}`);
            }
            else {
                setStatus(" Unknown error occurred");
            }
        }
    };
    return (_jsxs("div", { className: "p-6 max-w-md mx-auto", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Submit Loan Application" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block mb-1 font-medium", children: "Amount" }), _jsx("input", { type: "number", value: amount, onChange: (e) => setAmount(Number(e.target.value)), className: "w-full border rounded px-3 py-2", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block mb-1 font-medium", children: "Purpose" }), _jsx("input", { type: "text", value: purpose, onChange: (e) => setPurpose(e.target.value), className: "w-full border rounded px-3 py-2", required: true })] }), _jsx("button", { type: "submit", className: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700", children: "Submit" })] }), status && _jsx("p", { className: "mt-4", children: status })] }));
}
