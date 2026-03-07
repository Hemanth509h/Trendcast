import React, { useEffect, useState } from "react";
import "./app.css";
import { Sidebar } from "./ui/sidebar";
import { Route, Switch, useLocation } from "wouter";
import Salesdata from "./page/salesdata";
import Dashboard from "./page/Dashboard";
import Landing from "./page/Landing";
import { ToastContainer } from "./ui/toast";
import Forecasts from "./page/forecasts";
import AuthModal from "./page/AuthModal";
import { AuthProvider, useAuth } from "./page/AuthModal";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Redirect authenticated users away from auth modal
    if (isAuthenticated && location === "/") {
      // Allow staying on the same page
    }
  }, [location, isAuthenticated]);

  if (loading && false) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <>
      <Switch>
        <Route path="/">
          {!isAuthenticated ? (
            <Landing onLoginClick={() => setShowAuthModal(true)} />
          ) : (
            <div className="app-container">
              <Sidebar />
              <main className="main-content">
                <Dashboard />
              </main>
              <ToastContainer />
            </div>
          )}
        </Route>
        <Route path="/Sales">
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <div className="salesdata-container">
                <Salesdata />
              </div>
            </main>
            <ToastContainer />
          </div>
        </Route>
        <Route path="/Forecasts">
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <div className="salesdata-container">
                <Forecasts />
              </div>
            </main>
            <ToastContainer />
          </div>
        </Route>
      </Switch>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;