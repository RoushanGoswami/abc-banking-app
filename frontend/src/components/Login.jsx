import React, { useState } from "react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Please check credentials.",
        );
      }

      // Save token and user session to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Notify parent App component
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>ABC Co-operative Bank</h2>
        <p style={styles.subtitle}>Enterprise Core Banking Portal</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Employee Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., teller_ahmedabad"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Authenticating..." : "Sign In to Branch Portal"}
          </button>
        </form>

        <div style={styles.hint}>
          <p>
            <strong>Test Accounts:</strong>
          </p>
          <p>
            <code>admin_master</code> | <code>admin</code> (Admin)
          </p>
          <p>
            <code>mgr_ahmedabad</code> | <code>ahmedabad</code> (Manager)
          </p>
          <p>
            <code>teller_ahmedabad</code> | <code>ahmedabad</code> (Teller)
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "80vh",
    backgroundColor: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "32px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
  },
  title: {
    margin: "0 0 8px 0",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 24px 0",
    color: "#64748b",
    fontSize: "14px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#334155",
  },
  input: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    outline: "none",
  },
  button: {
    marginTop: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "#0f172a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  errorBox: {
    marginBottom: "16px",
    padding: "10px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "4px",
    fontSize: "13px",
    textAlign: "center",
  },
  hint: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#475569",
    lineHeight: "1.5",
  },
};
