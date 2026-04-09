<<<<<<< HEAD
import { TrendingUp, BarChart3, Zap, Check } from "lucide-react";
import "./css/landing.css";
import AuthModal from "./authmodule";
import { useState } from "react";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
=======
import React from "react";
import { useLocation } from "wouter";
import { TrendingUp, BarChart3, Zap, Check, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./landing.css";

export default function Landing({ onLoginClick }) {
  const { theme, toggleTheme } = useTheme();
>>>>>>> hemanth

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <TrendingUp size={28} />
            <span>Trendcast</span>
          </div>
          <button className="nav-login-btn" onClick={() => setIsAuthModalOpen(true)}>
            Login
          </button>
        </div>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <section className="hero">
        <div className="hero-content">
          <h1>Forecast Your Future Sales</h1>
          <p>
            Powerful AI-driven sales forecasting that helps you make smarter
            predictions and strategic decisions.
          </p>
          <button className="hero-cta" onClick={() => setIsAuthModalOpen(true)}>
            Get Started Free
          </button>
        </div>
        <div className="hero-visual">
          <div className="chart-illustration">
            <div className="bar" style={{ height: "30%" }}></div>
            <div className="bar" style={{ height: "45%" }}></div>
            <div className="bar" style={{ height: "60%" }}></div>
            <div className="bar" style={{ height: "50%" }}></div>
            <div className="bar" style={{ height: "75%" }}></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose Trendcast?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <BarChart3 size={32} />
            <h3>Advanced Analytics</h3>
            <p>Deep insights into your sales patterns and trends with AI-powered analysis.</p>
          </div>
          <div className="feature-card">
            <Zap size={32} />
            <h3>Real-time Forecasts</h3>
            <p>Get instant predictions updated with your latest sales data automatically.</p>
          </div>
          <div className="feature-card">
            <TrendingUp size={32} />
            <h3>Easy Integration</h3>
            <p>Upload your CSV or XLSX files and start forecasting in seconds.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Upload Data</h4>
            <p>Import your historical sales data in CSV or Excel format</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Analyze</h4>
            <p>Our AI analyzes patterns and trends in your data</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>Forecast</h4>
            <p>Get accurate predictions for future sales periods</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>Decide</h4>
            <p>Make data-driven decisions with confidence</p>
          </div>
        </div>
      </section>



      <section className="final-cta">
        <h2>Ready to Transform Your Sales Strategy?</h2>
        <p>Join thousands of businesses using Trendcast to forecast accurately.</p>
        <button className="final-cta-btn" onClick={() => setIsAuthModalOpen(true)} >
          Sign Up Now
        </button>
      </section>


      <footer className="landing-footer">
        <p>&copy; 2026 Trendcast. All rights reserved.</p>
      </footer>
    </div>
  );
}
