import React, { useEffect, useState } from "react";
import "./app.css";
import { Sidebar } from "./ui/sidebar";
import { Route, Switch, useLocation } from "wouter";
import Salesdata from "./page/salesdata";
import Landing from "./page/Landing";
import { ToastContainer } from "./ui/toast";
import Forecasts from "./page/forecasts";
import Profile from "./page/Profile";
import AuthModal from "./page/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
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
                <div className="page-container">
                  <Salesdata />
                </div>
              </main>
                          </div>
          )}
        </Route>
        <Route path="/Forecasts">
          {!isAuthenticated ? (
            <Landing onLoginClick={() => setShowAuthModal(true)} />
          ) : (
            <div className="app-container">
              <Sidebar />
              <main className="main-content">
                <div className="page-container">
                  <Forecasts />
                </div>
              </main>
                          </div>
          )}
        </Route>
        <Route path="/Profile">
          {!isAuthenticated ? (
            <Landing onLoginClick={() => setShowAuthModal(true)} />
          ) : (
            <div className="app-container">
              <Sidebar />
              <main className="main-content">
                <div className="page-container">
                  <Profile />
                </div>
              </main>
            </div>
          )}
        </Route>
      </Switch>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
          <Router />
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;