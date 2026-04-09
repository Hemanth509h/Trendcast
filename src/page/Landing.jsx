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
<<<<<<< HEAD
          <button className="nav-login-btn" onClick={() => setIsAuthModalOpen(true)}>
            Login
          </button>
        </div>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    
=======
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
              {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
            </button>
            <button className="nav-login-btn" onClick={onLoginClick}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
>>>>>>> hemanth
      <section className="hero">
        <div className="hero-content">
          <h1>Forecast Your Future Sales</h1>
          <p>
            Powerful AI-driven sales forecasting that helps you make smarter
            predictions and strategic decisions.
          </p>
<<<<<<< HEAD
          <button className="hero-cta" onClick={() => setIsAuthModalOpen(true)}>
=======
          <button className="hero-cta" onClick={onLoginClick}>
>>>>>>> hemanth
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

<<<<<<< HEAD
    
=======
      {/* Features Section */}
>>>>>>> hemanth
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

<<<<<<< HEAD

=======
      {/* How It Works */}
>>>>>>> hemanth
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

<<<<<<< HEAD
      

      <section className="final-cta">
        <h2>Ready to Transform Your Sales Strategy?</h2>
        <p>Join thousands of businesses using Trendcast to forecast accurately.</p>
        <button className="final-cta-btn" onClick={() => setIsAuthModalOpen(true)} >
=======
      {/* Pricing Section */}
      <section className="pricing">
        <h2>Simple, Transparent Pricing</h2>
        <div className="pricing-card">
          <h3>Free Trial</h3>
          <p className="price">Free</p>
          <ul>
            <li><Check size={18} /> Unlimited forecasts</li>
            <li><Check size={18} /> 5 datasets included</li>
            <li><Check size={18} /> Basic analytics</li>
            <li><Check size={18} /> Email support</li>
          </ul>
          <button className="pricing-cta" onClick={onLoginClick}>
            Start Free Trial
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta">
        <h2>Ready to Transform Your Sales Strategy?</h2>
        <p>Join thousands of businesses using Trendcast to forecast accurately.</p>
        <button className="final-cta-btn" onClick={onLoginClick}>
>>>>>>> hemanth
          Sign Up Now
        </button>
      </section>

<<<<<<< HEAD
     
=======
      {/* Footer */}
>>>>>>> hemanth
      <footer className="landing-footer">
        <p>&copy; 2026 Trendcast. All rights reserved.</p>
      </footer>
    </div>
  );
}
