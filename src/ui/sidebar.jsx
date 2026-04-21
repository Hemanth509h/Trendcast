import React from 'react'
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  TrendingUp,
  TableProperties,
  LineChart,
  Trash2,
  Loader2,
  Sparkles,
  LogOut,
  User,
  LogIn,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./ui.css";

const path = [
  { label: "Sales Data", icon: TableProperties, href: "/" },
  { label: "Forecasts", icon: TrendingUp, href: "/Forecasts" },
  { label: "Profile", icon: User, href: "/Profile" }
];

export function Sidebar({ onLoginClick, isOpen, onClose }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="logo">
              <LineChart className="linechart" />
              <h1 className="text-xl font-bold tracking-tight font-display text-foreground">
                Trendcast
              </h1>
            </div>
            <button className="mobile-menu-toggle" onClick={onClose} style={{ display: 'none' }}>
              <X size={24} />
            </button>
          </div>
        </div>
        <hr />
        <div className="menu">
          {path.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                href={item.href}
                key={item.href}
                className={`menu-item ${isActive ? "menu-item-active" : ""}`}
                onClick={onClose}
              >
                <item.icon
                  className={`menu-icon ${isActive ? "menu-icon-active" : ""}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {!user && (
            <button className="login-button" onClick={onLoginClick}>
              <LogIn size={20} />
              <span>Login</span>
            </button>
          )}

          {user && (
            <div className="user-section">
              <div className="user-card">
                <div className="user-avatar">
                  {user?.full_name?.[0]?.toUpperCase() || <User size={18} />}
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.full_name || 'User'}</span>
                  <span className="user-email">{user?.email}</span>
                </div>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
