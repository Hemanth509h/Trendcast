import React, { useEffect } from "react";
import "./app.css";
import { Sidebar } from "./ui/sidebar";
import { Route, Switch, useLocation } from "wouter";
import Salesdata from "./page/salesdata";
import { ToastContainer } from "./ui/toast";
import Forecasts from "./page/forecasts";
import Landing from "./page/Landing";

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check if we are at the root path and redirect
    if (location === "/") {
      setLocation("/");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/Sales" component={Salesdata} />
      <Route path="/Forecasts" component={Forecasts} />
    </Switch>
  );
}

function App() {
  return (
    <div className="app-container">
      <Router />
      <ToastContainer />
    </div>
  );
}

export default App;