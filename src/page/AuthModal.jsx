import React, { useState, createContext, useContext, useEffect } from "react";
import { Mail, Lock, User, AlertCircle, X, CheckCircle, Loader } from "lucide-react";
import { useLocation } from "wouter";
import "./auth-modal.css";

// -----------------------------------
// Authentication context/provider
// -----------------------------------

const AuthContext = createContext();

const API_BASE_URL = "";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            setToken(storedToken);
            setUser(data.user);
          } else {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const register = async (email, password, fullName) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Registration failed");

      // Registration successful - user needs to verify email
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      return { 
        success: true, 
        requiresVerification: true,
        verificationToken: data.user.message?.split(": ")[1] || ""
      };
    } catch (err) {
      const msg = err.message || "Error during registration";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const verifyEmail = async (email, verificationToken) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, verification_token: verificationToken }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Verification failed");

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login failed");

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      const msg = err.message || "Error during login";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  };

  const updateProfile = async (fullName) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Update failed");

      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getToken = () => token;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        verifyEmail,
        login,
        logout,
        updateProfile,
        getToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const { login, register, verifyEmail } = useAuth();
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

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!verificationToken.trim()) {
      setError("Please enter the verification token");
      setLoading(false);
      return;
    }

    const result = await verifyEmail(email, verificationToken);
    if (result.success) {
      setSuccess("Email verified! Redirecting to dashboard...");
      setTimeout(() => {
        onClose();
        setLocation("/Sales");
      }, 2000);
    } else {
      setError(result.error || "Verification failed");
    }
    setLoading(false);
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
          setLocation("/Sales");
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
        setSuccess(
          "Registration successful! Please check your verification token."
        );
        setNeedsVerification(true);
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
          {needsVerification ? (
            <>
              <h2>Verify Your Email</h2>
              <p>Enter the verification token sent to your email</p>
            </>
          ) : (
            <>
              <h2>{isLogin ? "Welcome Back" : "Join Trendcast"}</h2>
              <p>
                {isLogin
                  ? "Login to your account"
                  : "Create your account to get started"}
              </p>
            </>
          )}
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

        {needsVerification ? (
          <form onSubmit={handleVerifyEmail} className="auth-modal-form">
            <div className="form-group">
              <label htmlFor="verifyToken">Verification Token</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  id="verifyToken"
                  type="text"
                  placeholder="Paste token here"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spinner" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                setNeedsVerification(false);
                setVerificationToken("");
              }}
            >
              Back to {isLogin ? "Login" : "Registration"}
            </button>
          </form>
        ) : (
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
        )}

        {!needsVerification && (
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
        )}
      </div>
    </div>
  );
}
