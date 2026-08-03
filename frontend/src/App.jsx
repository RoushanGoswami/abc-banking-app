import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CustomerPortal from "./pages/CustomerPortal";
import TellerPortal from "./pages/TellerPortal";

function App() {
  return (
    <Router>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        {/* Navigation Bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #e2e8f0",
            paddingBottom: "15px",
          }}
        >
          <h1 style={{ margin: 0, color: "#1e3a8a" }}>ABC Banking Portal</h1>
          <nav style={{ display: "flex", gap: "15px" }}>
            <Link
              to="/"
              style={{
                textDecoration: "none",
                padding: "8px 16px",
                backgroundColor: "#e2e8f0",
                color: "#1e293b",
                borderRadius: "6px",
                fontWeight: "bold",
              }}
            >
              Customer Desk
            </Link>
            <Link
              to="/teller"
              style={{
                textDecoration: "none",
                padding: "8px 16px",
                backgroundColor: "#1e3a8a",
                color: "#ffffff",
                borderRadius: "6px",
                fontWeight: "bold",
              }}
            >
              Teller Portal
            </Link>
          </nav>
        </header>

        {/* Page Content */}
        <main style={{ marginTop: "30px" }}>
          <Routes>
            <Route path="/" element={<CustomerPortal />} />
            <Route path="/teller" element={<TellerPortal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
