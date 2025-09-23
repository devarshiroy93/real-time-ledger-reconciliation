import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";

import HowToUse from "./pages/HowToUse";

import DashboardPage from "./pages/Dashboard";

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />

        {/* Main content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/how-to-use" element={<HowToUse />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
