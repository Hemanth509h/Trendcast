import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LineChart as ChartIcon,
  TableProperties,
  TrendingUp,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  LogIn
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./ui.css";

export const NAV_ITEMS = [
  { label: "Sales", icon: TableProperties, href: "/" },
  { label: "Forecasts", icon: TrendingUp, href: "/Forecasts" },
  { label: "Profile", icon: UserIcon, href: "/Profile" }
];

export function Sidebar({ isOpen, onClose, onLoginClick }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} 
        onClick={onClose}
      ></div>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <ChartIcon className="linechart" />
            <h1>Trendcast</h1>
          </div>
          <button className="mobile-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <nav className="menu">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`menu-item ${isActive ? "menu-item-active" : ""}`}
                onClick={() => { if (window.innerWidth <= 1024) onClose(); }}
              >
                <item.icon className={`menu-icon ${isActive ? "menu-icon-active" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {!user ? (
            <button className="login-button" onClick={onLoginClick}>
              <LogIn size={20} />
              <span>Login</span>
            </button>
          ) : (
            <div className="user-section">
              <div className="user-card">
                <div className="user-avatar">
                  {user.full_name?.[0]?.toUpperCase() || <UserIcon size={18} />}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.full_name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
              <button className="logout-button" onClick={logout}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({ onOpenMenu }) {
  return (
    <header className="mobile-nav">
      <div className="logo" style={{ padding: 0 }}>
        <ChartIcon size={24} color="var(--primary)" />
        <span style={{ fontWeight: 800, fontSize: '18px', marginLeft: '8px' }}>Trendcast</span>
      </div>
      <button className="mobile-menu-toggle" onClick={onOpenMenu}>
        <Menu size={24} />
      </button>
    </header>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-content">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
