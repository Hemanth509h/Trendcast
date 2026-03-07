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
} from "lucide-react";
import { useAuth } from "../page/AuthModal";
import "./ui.css";

const path = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Sales Data", icon: TableProperties, href: "/Sales" },
  { label: "Forecasts", icon: TrendingUp, href: "/Forecasts" }
];

export function Sidebar({ onLoginClick }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

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

        <div className="menu" style={{ marginTop: 'auto' }}>
          {user && (
            <div className="footer" style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              <h5 className="h5" style={{ marginBottom: '4px', fontWeight: '600' }}>Pro Tip</h5>
              <p>
                Generate forecasts regularly to keep predictions accurate with
                latest sales data.
              </p>
            </div>
          )}
          
          {!user ? (
            <button className="menu-item" onClick={onLoginClick} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <LogIn className="menu-icon" />
              <span>Login</span>
            </button>
          ) : null}
        </div>
        
        {/* User Section */}
        {user && (
          <div className="sidebar-user">
            <hr style={{ margin: "10px 0" }} />
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
      </aside>
    </>
  );
}
