import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import AnnualPage from "./pages/AnnualPage";
import MonthlyPage from "./pages/MonthlyPage";
import WeeklyPage from "./pages/WeeklyPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import NotesPage from "./pages/NotesPage";
import YearCalendarPage from "./pages/YearCalendarPage";
import ZionPage from "./pages/ZionPage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PlannerLayout from "./components/PlannerLayout";
import { useState } from "react";
import { getISOWeek, getISOWeekYear } from "date-fns";

function PlannerRouter() {
  const [location] = useLocation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState(getISOWeek(new Date()));

  const isHome = location === "/";
  const isLogin = location === "/login";
  const isResetPassword = location.startsWith("/reset-password");

  if (isLogin) return <LoginPage />;
  if (isResetPassword) return <ResetPasswordPage />;
  if (isHome) return <Home />;

  return (
    <PlannerLayout
      currentYear={year}
      currentMonth={month}
      currentWeek={week}
      onYearChange={setYear}
      onMonthChange={setMonth}
      onWeekChange={setWeek}
    >
      <Switch>
        <Route path="/annual" component={AnnualPage} />
        <Route path="/monthly/:year/:month" component={MonthlyPage} />
        <Route path="/weekly/:year/:week" component={WeeklyPage} />
        <Route path="/year-calendar/:year" component={YearCalendarPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/notes" component={NotesPage} />
        <Route path="/zion" component={ZionPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </PlannerLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <PlannerRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
