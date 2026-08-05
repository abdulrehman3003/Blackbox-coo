import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import TeamPage from "./pages/TeamPage";
import AssistantPage from "./pages/AssistantPage";
import IntegrationsPage from "./pages/IntegrationsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — wrapped in app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}