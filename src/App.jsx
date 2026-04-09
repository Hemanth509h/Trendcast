import React, { useEffect, useState } from "react";
import "./app.css";
import { Sidebar } from "./ui/sidebar";
import { Route, Switch, useLocation } from "wouter";
import Salesdata from "./page/salesdata";
import Landing from "./page/Landing";
import { ToastContainer } from "./ui/toast";
import Forecasts from "./page/forecasts";
<<<<<<< HEAD
import Landing from "./page/Landing";
=======
import AuthModal from "./page/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";
>>>>>>> hemanth

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
<<<<<<< HEAD
    // Check if we are at the root path and redirect
    if (location === "/") {
      setLocation("/");
=======
    if (isAuthenticated && location === "/") {
      // Allow staying on the same page
>>>>>>> hemanth
    }
  }, [location, isAuthenticated]);

  if (loading && false) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
<<<<<<< HEAD
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/Sales" component={Salesdata} />
      <Route path="/Forecasts" component={Forecasts} />
    </Switch>
=======
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
              <ToastContainer />
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
              <ToastContainer />
            </div>
          )}
        </Route>
      </Switch>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
>>>>>>> hemanth
  );
}

function App() {
  return (
<<<<<<< HEAD
    <div className="app-container">
      <Router />
      <ToastContainer />
    </div>
=======
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
          <Router />
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
>>>>>>> hemanth
  );
}

export default App;