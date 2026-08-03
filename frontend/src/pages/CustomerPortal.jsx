import { useState } from "react";
import api from "../api";

function CustomerPortal() {
  const [accountNumber, setAccountNumber] = useState("100000000001");
  const [accountData, setAccountData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccountData(null);

    try {
      // Adjust this endpoint if your backend route name is slightly different
      const res = await api.get(`/api/accounts/${accountNumber}`);
      setAccountData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Account not found. Check the account number.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: "#1e3a8a" }}>Customer Account Lookup</h2>
      <p style={{ color: "#4b5563" }}>
        Enter your 12-digit account number to view balance & details.
      </p>

      <form
        onSubmit={fetchAccount}
        style={{ marginTop: "15px", display: "flex", gap: "10px" }}
      >
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="e.g. 100000000001"
          style={{
            padding: "10px",
            fontSize: "16px",
            width: "250px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Searching..." : "Check Balance"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {accountData && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>
            Account Summary
          </h3>
          <p>
            <strong>Account Number:</strong> {accountData.account_number}
          </p>
          <p>
            <strong>Account Type:</strong> {accountData.account_type}
          </p>
          <p style={{ fontSize: "20px", color: "#16a34a", fontWeight: "bold" }}>
            Balance: ₹{Number(accountData.balance).toLocaleString("en-IN")}
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomerPortal;
