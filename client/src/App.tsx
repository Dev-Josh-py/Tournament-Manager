import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./lib/theme";
import { isAuthenticated } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Leaderboard from "@/pages/Leaderboard";
import IndividualLeaderboard from "@/pages/IndividualLeaderboard";
import Schedule from "@/pages/Schedule";
import Scoring from "@/pages/Scoring";
import PlayerScorecard from "@/pages/PlayerScorecard";
import RoundSetup from "@/pages/RoundSetup";
import Rules from "@/pages/Rules";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Leaderboard} />
      <Route path="/individual" component={IndividualLeaderboard} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/scoring" component={Scoring} />
      <Route path="/scorecard" component={PlayerScorecard} />
      <Route path="/round-setup" component={RoundSetup} />
      <Route path="/rules" component={Rules} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  useEffect(() => {
    // Listen for storage changes to detect login/logout
    const handleStorageChange = () => {
      setAuthenticated(isAuthenticated());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Also check on component mount in case auth changed during page load
  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  if (!authenticated) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <Login />
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
