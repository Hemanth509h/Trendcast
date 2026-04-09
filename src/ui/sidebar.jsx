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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./ui.css";

const path = [
  { label: "Sales Data", icon: TableProperties, href: "/" },
  { label: "Forecasts", icon: TrendingUp, href: "/Forecasts" }
];

export function Sidebar({ onLoginClick }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-content">
          <div>
            <div className="logo">
              <LineChart className="linechart" />
              <h1 className="text-xl font-bold tracking-tight font-display text-foreground">
                Trendcast
              </h1>
            </div>
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
              >
                <item.icon
                  className={`menu-icon ${isActive ? "menu-icon-active" : ""}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <hr />

        <div className="sidebar-bottom" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="menu-item" onClick={toggleTheme} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', padding: '12px 16px' }}>
            {theme === 'light' ? <Moon className="menu-icon" /> : <Sun className="menu-icon" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {!user ? (
            <button className="menu-item" onClick={onLoginClick} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', padding: '12px 16px' }}>
              <LogIn className="menu-icon" />
              <span>Login</span>
            </button>
          ) : null}

          {/* User Section */}
          {user && (
            <div className="sidebar-user" style={{ marginTop: '10px' }}>
              <hr style={{ margin: "0 0 10px 0" }} />
              <div className="user-info">
                <div className="user-avatar">
                  <User size={18} />
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.full_name || user?.email}</p>
                  <p className="user-email">{user?.email}</p>
                </div>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
