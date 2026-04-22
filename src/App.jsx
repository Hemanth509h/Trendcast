import React, { useEffect, useState } from "react";
import "./app.css";
import { Route, Switch, useLocation, Link } from "wouter";
import Salesdata from "./page/salesdata";
import Landing from "./page/Landing";
import { ToastContainer } from "./ui/toast";
import Forecasts from "./page/forecasts";
import Profile from "./page/Profile";
import AuthModal from "./page/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";

import { Sidebar, MobileHeader, BottomNav } from "./ui/Navigation";

function Layout({ children, onLoginClick }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return children;

  return (
    <div className="app-container">
      <MobileHeader onOpenMenu={() => setIsSidebarOpen(true)} />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onLoginClick={onLoginClick} 
      />
      
      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading && false) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <>
      <Layout onLoginClick={() => setShowAuthModal(true)}>
        <Switch>
          <Route path="/">
            {!isAuthenticated ? (
              <Landing onLoginClick={() => setShowAuthModal(true)} />
            ) : (
              <Salesdata />
            )}
          </Route>
          <Route path="/Forecasts">
            {!isAuthenticated ? (
              <Landing onLoginClick={() => setShowAuthModal(true)} />
            ) : (
              <Forecasts />
            )}
          </Route>
          <Route path="/Profile">
            {!isAuthenticated ? (
              <Landing onLoginClick={() => setShowAuthModal(true)} />
            ) : (
              <Profile />
            )}
          </Route>
        </Switch>
      </Layout>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ToastContainer />
    </>
  );
}

function App() {
  useEffect(() => {
    document.title = "Trendcast | Intelligent Sales Forecasting";
  }, []);

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