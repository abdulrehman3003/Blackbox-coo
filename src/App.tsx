import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import TeamPage from "./pages/TeamPage";
import AssistantPage from "./pages/AssistantPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SalesPage from "./pages/SalesPage";
import ExpensesPage from "./pages/ExpensesPage";
import InventoryPage from "./pages/InventoryPage";
import CustomersPage from "./pages/CustomersPage";
import ReportsPage from "./pages/ReportsPage";
import UploadPage from "./pages/UploadPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import CommandCenterPage from "./pages/CommandCenterPage";
import AgentDashboardPage from "./pages/AgentDashboardPage";
import PrivacyPage from "./pages/PrivacyPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected routes — wrapped in app shell */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding — full screen, no shell */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* App shell routes */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/command-center/:agentName" element={<AgentDashboardPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}