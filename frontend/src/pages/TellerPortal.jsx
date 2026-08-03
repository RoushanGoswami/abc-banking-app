import { useState } from "react";
import api from "../api";

function TellerPortal() {
  const [accountNumber, setAccountNumber] = useState("100000000001");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("DEPOSIT");
  const [statusMsg, setStatusMsg] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMsg(null);

    try {
      const res = await api.post("/api/transactions", {
        accountNumber,
        type,
        amount: Number(amount),
      });
      setStatusMsg(res.data);
      setAmount("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Transaction failed. Check server logs.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: "#1e3a8a" }}>Teller Transaction Desk</h2>
      <p style={{ color: "#4b5563" }}>
        Process instant deposits and withdrawals for any customer account.
      </p>

      <form
        onSubmit={handleTransaction}
        style={{
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          maxWidth: "400px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
            required
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Transaction Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          >
            <option value="DEPOSIT">Deposit (+)</option>
            <option value="WITHDRAW">Withdraw (-)</option>
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Amount (₹)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px",
            backgroundColor: "#1e3a8a",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Processing..." : `Submit ${type}`}
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
            maxWidth: "400px",
          }}
        >
          {error}
        </div>
      )}

      {statusMsg && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#dcfce7",
            border: "1px solid #16a34a",
            borderRadius: "8px",
            maxWidth: "400px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#166534" }}>
            {statusMsg.message}
          </h3>
          <p style={{ margin: "5px 0" }}>
            <strong>Account:</strong> {statusMsg.accountNumber}
          </p>
          <p
            style={{
              margin: "5px 0",
              fontSize: "18px",
              color: "#15803d",
              fontWeight: "bold",
            }}
          >
            Updated Balance: ₹
            {Number(statusMsg.newBalance).toLocaleString("en-IN")}
          </p>
        </div>
      )}
    </div>
  );
}

export default TellerPortal;
