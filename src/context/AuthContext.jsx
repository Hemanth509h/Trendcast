import React, { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "./Contexts";

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

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      return { 
        success: true, 
        requiresVerification: false
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

  const getToken = useCallback(() => token, [token]);

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
