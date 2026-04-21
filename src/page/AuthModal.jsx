import React, { useState, createContext, useContext, useEffect } from "react";
import { Mail, Lock, User, AlertCircle, X, CheckCircle, Loader } from "lucide-react";
import { useLocation } from "wouter";
import "./auth-modal.css";

import { useAuth } from "../context/AuthContext";

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number";
    return null;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isLogin) {
      // Login validation
      if (!email) {
        setError("Email is required");
        return;
      }
      if (!validateEmail(email)) {
        setError("Please enter a valid email");
        return;
      }
      if (!password) {
        setError("Password is required");
        return;
      }

      setLoading(true);
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          onClose();
          setLocation("/");
        }, 1000);
      } else {
        setError(result.error);
      }
    } else {
      // Registration validation
      if (!fullName.trim()) {
        setError("Full name is required");
        return;
      }
      if (!email) {
        setError("Email is required");
        return;
      }
      if (!validateEmail(email)) {
        setError("Please enter a valid email");
        return;
      }
      if (!password) {
        setError("Password is required");
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setLoading(true);
      const result = await register(email, password, fullName);
      setLoading(false);

      if (result.success) {
        setSuccess("Registration successful! Please login to continue.");
        setIsLogin(true);
        setError("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(result.error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="auth-modal-header">
          <h2>{isLogin ? "Welcome Back" : "Join Trendcast"}</h2>
          <p>
            {isLogin
              ? "Login to your account"
              : "Create your account to get started"}
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-success-banner">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-modal-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
              </div>
              {!isLogin && (
                <small className="password-hint">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                </small>
              )}
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={18} className="spinner" />
                  {isLogin ? "Logging in..." : "Creating account..."}
                </>
              ) : isLogin ? (
                "Login"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

        <div className="auth-modal-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setFullName("");
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
