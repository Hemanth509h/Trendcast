import React, { useState } from "react";
import { Mail, Lock, User, AlertCircle, X } from "lucide-react";
import "./css/authmodule.css";

/* ================= COMPONENT ================= */
export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  /* ================= SUBMIT HANDLER ================= */
  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        await authService.register(email, password, fullName);
        setIsLogin(true); // switch to login after signup
      }

      onClose();
      window.location.reload(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE BUTTON */}
        <button className="auth-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* HEADER */}
        <div className="auth-modal-header">
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>{isLogin ? "Login to your account" : "Sign up to get started"}</p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* FORM */}
        <form className="auth-modal-form">
          {/* FULL NAME */}
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* EMAIL */}
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          {!isLogin && (
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            className="auth-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* FOOTER */}
        <div className="auth-modal-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================= API SERVICE ================= */

const API_BASE_URL = "http://localhost:5000/api"; // change in production

const authService = {
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    localStorage.setItem("authToken", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data;
  },

  async register(email, password, fullName) {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Registration failed");
    }

    return data;
  },

  logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  getToken() {
    return localStorage.getItem("authToken");
  },

  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};
