import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("TELLER"); // TELLER | SEARCH | REPORTS | BRANCHES
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Teller Form States
  const [accountNumber, setAccountNumber] = useState("");
  const [accountData, setAccountData] = useState(null);
  const [transferData, setTransferData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
  });

  // New Account Onboarding State
  const [onboardData, setOnboardData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    panNumber: "",
    branchId: "1",
    accountType: "SAVINGS",
    initialDeposit: "",
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Reports & Branches State
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [pnlReport, setPnlReport] = useState(null);
  const [branches, setBranches] = useState([]);
  const [newBranch, setNewBranch] = useState({
    branchName: "",
    city: "",
    ifscCode: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setAccountData(null);
  };

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  // --- API HANDLERS ---

  const handleAccountLookup = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetch(
        `http://localhost:5000/api/accounts/${accountNumber}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAccountData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        "http://localhost:5000/api/transactions/transfer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transferData),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg(`Transfer of ₹${transferData.amount} successful!`);
      setTransferData({ fromAccount: "", toAccount: "", amount: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOnboardAccount = async (e) => {
    e.preventDefault();
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/accounts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...onboardData,
          initialDeposit: Number(onboardData.initialDeposit),
          branchId: Number(onboardData.branchId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg(
        `Account onboarded! Number: ${data.accountNumber} | Initial Balance: ₹${data.balance}`,
      );
      setOnboardData({
        firstName: "",
        lastName: "",
        phone: "",
        panNumber: "",
        branchId: "1",
        accountType: "SAVINGS",
        initialDeposit: "",
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://localhost:5000/api/search?query=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSearchResults(data.results);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadFinancialReports = async () => {
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const [dashRes, pnlRes] = await Promise.all([
        fetch("http://localhost:5000/api/reports/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/reports/pnl", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const dashData = await dashRes.json();
      const pnlData = await pnlRes.json();
      setDashboardMetrics(dashData);
      setPnlReport(pnlData);
    } catch (err) {
      setError("Failed to load financial reports.");
    }
  };

  const loadBranches = async () => {
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/branches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBranches(data);
    } catch (err) {
      setError("Failed to load branches.");
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    clearMessages();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBranch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg(`Branch "${data.branch.branch_name}" added successfully!`);
      setNewBranch({ branchName: "", city: "", ifscCode: "" });
      loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };
  const handleEditBranch = async (branch) => {
    const newName = prompt("Enter new Branch Name:", branch.branch_name);
    const newCity = prompt("Enter new City:", branch.city);
    const newIfsc = prompt("Enter new IFSC Code:", branch.ifsc_code);

    if (!newName || !newCity || !newIfsc) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://localhost:5000/api/branches/${branch.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            branchName: newName,
            city: newCity,
            ifscCode: newIfsc.toUpperCase(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg("Branch updated successfully!");
      loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBranch = async (id, branchName) => {
    if (
      !window.confirm(`Are you sure you want to delete branch "${branchName}"?`)
    )
      return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/branches/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg("Branch deleted successfully!");
      loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };
  // --- OFFICIAL PDF GENERATOR ---
  const handleDownloadPDF = () => {
    if (!dashboardMetrics || !pnlReport) return;
    const doc = new jsPDF();

    // Bank Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text("ABC Co-operative Bank", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Enterprise Financial & Audit Report | Date: ${new Date().toLocaleDateString()}`,
      14,
      28,
    );
    doc.text(`Scope: ${dashboardMetrics.scope}`, 14, 34);

    // Summary Analytics Table
    autoTable(doc, {
      startY: 42,
      head: [["Metric Category", "Recorded Value"]],
      body: [
        ["Total Active Accounts", dashboardMetrics.accounts.total_accounts],
        [
          "Total Deposit Base (INR)",
          `₹${Number(dashboardMetrics.accounts.total_deposits).toLocaleString(
            "en-IN",
          )}`,
        ],
        ["Audit Compliance Status", pnlReport.status],
        [
          "Total Estimated Revenue",
          `₹${pnlReport.revenue.totalIncome.toLocaleString("en-IN")}`,
        ],
        [
          "Total Operational Expense",
          `₹${pnlReport.expenses.totalExpense.toLocaleString("en-IN")}`,
        ],
        [
          "Net Profit / Loss",
          `₹${pnlReport.netProfitLoss.toLocaleString("en-IN")}`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [0, 82, 204] },
    });

    doc.save(`ABC_Bank_Audit_Report_${Date.now()}.pdf`);
  };

  useEffect(() => {
    if (activeTab === "REPORTS" && user) loadFinancialReports();
    if (activeTab === "BRANCHES" && user) loadBranches();
  }, [activeTab]);

  if (!user)
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;

  return (
    <div style={styles.appContainer}>
      {/* Top Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>ABC Co-operative Bank</h1>
          <p style={styles.branchSubtitle}>
            Branch: <strong>{user.branchName}</strong> ({user.city}) | Role:{" "}
            <strong>{user.role}</strong>
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout ({user.username})
        </button>
      </header>

      {/* Navigation Tabs */}
      <nav style={styles.navbar}>
        <button
          style={activeTab === "TELLER" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("TELLER")}
        >
          Teller Operations & Onboarding
        </button>
        <button
          style={activeTab === "SEARCH" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("SEARCH")}
        >
          Customer Search
        </button>
        {(user.role === "MANAGER" || user.role === "ADMIN") && (
          <button
            style={activeTab === "REPORTS" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("REPORTS")}
          >
            Financial Dashboard & P&L
          </button>
        )}
        {user.role === "ADMIN" && (
          <button
            style={activeTab === "BRANCHES" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("BRANCHES")}
          >
            Branch Management (Admin)
          </button>
        )}
      </nav>

      {/* Main Content Area */}
      <main style={styles.main}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}

        {/* TAB 1: TELLER OPERATIONS & ACCOUNT ONBOARDING */}
        {activeTab === "TELLER" && (
          <div>
            <div style={styles.gridContainer}>
              <div style={styles.card}>
                <h3>Account Lookup & Balance</h3>
                <form onSubmit={handleAccountLookup} style={styles.formGroup}>
                  <input
                    type="text"
                    placeholder="Enter 12-digit Account #"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button type="submit" style={styles.primaryBtn}>
                    Check Balance
                  </button>
                </form>
                {accountData && (
                  <div style={styles.infoBox}>
                    <p>
                      <strong>Holder:</strong> {accountData.first_name}{" "}
                      {accountData.last_name}
                    </p>
                    <p>
                      <strong>Type:</strong> {accountData.account_type} |{" "}
                      <strong>Status:</strong> {accountData.status}
                    </p>
                    <p>
                      <strong>IFSC:</strong> {accountData.ifsc_code}
                    </p>
                    <p style={styles.balanceText}>
                      Balance: ₹
                      {Number(accountData.balance).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <h3>ACID Fund Transfer (NEFT/RTGS)</h3>
                <form
                  onSubmit={handleTransfer}
                  style={styles.formGroupVertical}
                >
                  <input
                    type="text"
                    placeholder="From Account Number"
                    value={transferData.fromAccount}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        fromAccount: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <input
                    type="text"
                    placeholder="To Account Number"
                    value={transferData.toAccount}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        toAccount: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={transferData.amount}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        amount: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <button type="submit" style={styles.successBtn}>
                    Execute Atomic Transfer
                  </button>
                </form>
              </div>
            </div>

            {/* NEW ACCOUNT ONBOARDING CARD */}
            <div style={{ ...styles.cardFull, marginTop: "24px" }}>
              <h3>New Customer & Account Onboarding</h3>
              <form
                onSubmit={handleOnboardAccount}
                style={styles.formGroupVertical}
              >
                <div style={styles.formGroup}>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={onboardData.firstName}
                    onChange={(e) =>
                      setOnboardData({
                        ...onboardData,
                        firstName: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={onboardData.lastName}
                    onChange={(e) =>
                      setOnboardData({
                        ...onboardData,
                        lastName: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <input
                    type="text"
                    placeholder="PAN Number (10 chars)"
                    value={onboardData.panNumber}
                    onChange={(e) =>
                      setOnboardData({
                        ...onboardData,
                        panNumber: e.target.value.toUpperCase(),
                      })
                    }
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={onboardData.phone}
                    onChange={(e) =>
                      setOnboardData({ ...onboardData, phone: e.target.value })
                    }
                    style={styles.input}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Initial Deposit (₹)"
                    value={onboardData.initialDeposit}
                    onChange={(e) =>
                      setOnboardData({
                        ...onboardData,
                        initialDeposit: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />
                  <select
                    value={onboardData.accountType}
                    onChange={(e) =>
                      setOnboardData({
                        ...onboardData,
                        accountType: e.target.value,
                      })
                    }
                    style={styles.input}
                  >
                    <option value="SAVINGS">SAVINGS</option>
                    <option value="CURRENT">CURRENT</option>
                  </select>
                </div>
                <button type="submit" style={styles.primaryBtn}>
                  Create Customer & Bank Account
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ADVANCED ENTERPRISE SEARCH */}
        {activeTab === "SEARCH" && (
          <div style={styles.cardFull}>
            <h3>Enterprise Account Retrieval (&lt; 2 Second SLA)</h3>
            <form onSubmit={handleSearch} style={styles.formGroup}>
              <input
                type="text"
                placeholder="Search by Account Number, Name, PAN, or Phone Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...styles.input, flex: 3 }}
                required
              />
              <button type="submit" style={styles.primaryBtn}>
                Search Database
              </button>
            </form>

            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Account #</th>
                  <th style={styles.th}>Customer Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>PAN</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((acc) => (
                  <tr key={acc.account_number} style={styles.tableRow}>
                    <td style={styles.td}>{acc.account_number}</td>
                    <td style={styles.td}>
                      {acc.first_name} {acc.last_name}
                    </td>
                    <td style={styles.td}>{acc.phone}</td>
                    <td style={styles.td}>{acc.pan_number}</td>
                    <td style={styles.td}>{acc.branch_name}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: "bold",
                        color: "#16a34a",
                      }}
                    >
                      ₹{Number(acc.balance).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: EXECUTIVE FINANCIAL REPORTING & PDF EXPORT */}
        {activeTab === "REPORTS" && (
          <div>
            {/* --- CSV & PDF REPORT EXPORT BUTTONS --- */}
            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button onClick={handleDownloadPDF} style={styles.successBtn}>
                📄 Download Official Audit PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(
                      "http://localhost:5000/api/reports/export",
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      },
                    );
                    if (!res.ok) throw new Error("Export failed");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ABC_Bank_Audit_Report_${Date.now()}.csv`;
                    a.click();
                  } catch (err) {
                    alert(
                      "Error downloading report: Make sure your backend server is running!",
                    );
                  }
                }}
                style={styles.primaryBtn}
              >
                📥 Download Branch Audit CSV Report
              </button>
            </div>

            <div style={styles.gridContainer}>
              {dashboardMetrics && (
                <div style={styles.card}>
                  <h3>Branch Position Summary</h3>
                  <p>
                    <strong>Scope:</strong> {dashboardMetrics.scope}
                  </p>
                  <div style={styles.metricGrid}>
                    <div style={styles.metricTile}>
                      <p style={styles.metricLabel}>Total Accounts</p>
                      <p style={styles.metricValue}>
                        {dashboardMetrics.accounts.total_accounts}
                      </p>
                    </div>
                    <div style={styles.metricTile}>
                      <p style={styles.metricLabel}>Total Deposit Base</p>
                      <p style={styles.metricValue}>
                        ₹
                        {Number(
                          dashboardMetrics.accounts.total_deposits,
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {pnlReport && (
                <div style={styles.card}>
                  <h3>Profit & Loss Statement (P&L)</h3>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                      {pnlReport.status}
                    </span>
                  </p>
                  <p>
                    <strong>Total Estimated Revenue:</strong> ₹
                    {pnlReport.revenue.totalIncome.toLocaleString("en-IN")}
                  </p>
                  <p>
                    <strong>Total Operational Expenses:</strong> ₹
                    {pnlReport.expenses.totalExpense.toLocaleString("en-IN")}
                  </p>
                  <hr />
                  <h4 style={{ color: "#0f172a" }}>
                    Net Profit: ₹
                    {pnlReport.netProfitLoss.toLocaleString("en-IN")}
                  </h4>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BRANCH MANAGEMENT (ADMIN ONLY) */}
        {activeTab === "BRANCHES" && (
          <div>
            <div style={styles.cardFull}>
              <h3>Add New Branch Office</h3>
              <form
                onSubmit={handleCreateBranch}
                style={{ ...styles.formGroup, marginBottom: 0 }}
              >
                <input
                  type="text"
                  placeholder="Branch Name (e.g., Surat Main)"
                  value={newBranch.branchName}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, branchName: e.target.value })
                  }
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="City (e.g., Surat)"
                  value={newBranch.city}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, city: e.target.value })
                  }
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="IFSC Prefix (e.g., ABCB0000004)"
                  value={newBranch.ifscCode}
                  onChange={(e) =>
                    setNewBranch({
                      ...newBranch,
                      ifscCode: e.target.value.toUpperCase(),
                    })
                  }
                  style={styles.input}
                  required
                />
                <button type="submit" style={styles.primaryBtn}>
                  + Create Branch
                </button>
              </form>
            </div>

            <div style={{ ...styles.cardFull, marginTop: "24px" }}>
              <h3>Active Branches Network</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Branch Name</th>
                    <th style={styles.th}>City</th>
                    <th style={styles.th}>IFSC Code</th>
                    <th style={styles.th}>Total Accounts</th>
                    <th style={styles.th}>Total Deposits (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id} style={styles.tableRow}>
                      <td style={styles.td}>#{b.id}</td>
                      <td style={{ ...styles.td, fontWeight: "bold" }}>
                        {b.branch_name}
                      </td>
                      <td style={styles.td}>{b.city}</td>
                      <td style={styles.td}>{b.ifsc_code}</td>
                      <td style={styles.td}>{b.total_accounts}</td>
                      <td style={{ ...styles.td, color: "#16a34a" }}>
                        ₹{Number(b.total_deposits).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
  },
  headerTitle: { margin: 0, color: "#0f172a", fontSize: "22px" },
  branchSubtitle: { margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  navbar: {
    display: "flex",
    gap: "8px",
    padding: "12px 32px",
    backgroundColor: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
  },
  tab: {
    padding: "10px 18px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#475569",
  },
  activeTab: {
    padding: "10px 18px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderBottom: "none",
    borderRadius: "6px 6px 0 0",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#0f172a",
  },
  main: { padding: "32px" },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  cardFull: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  formGroup: { display: "flex", gap: "10px", marginBottom: "16px" },
  formGroupVertical: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    outline: "none",
  },
  primaryBtn: {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  successBtn: {
    padding: "10px 20px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  errorBox: {
    padding: "12px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "4px",
    marginBottom: "16px",
  },
  successBox: {
    padding: "12px",
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    borderRadius: "4px",
    marginBottom: "16px",
  },
  infoBox: {
    marginTop: "16px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  balanceText: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#16a34a",
    marginTop: "8px",
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "16px" },
  tableHeader: { backgroundColor: "#f1f5f9", textAlign: "left" },
  th: { padding: "12px", borderBottom: "2px solid #cbd5e1", color: "#334155" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "14px" },
  tableRow: { "&:hover": { backgroundColor: "#f8fafc" } },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginTop: "16px",
  },
  metricTile: {
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  metricLabel: { margin: 0, fontSize: "12px", color: "#64748b" },
  metricValue: {
    margin: "8px 0 0 0",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#0f172a",
  },
};
