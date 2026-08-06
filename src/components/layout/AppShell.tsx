import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ErrorBoundary from "../ui/ErrorBoundary";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      {/* Main area — offset for desktop sidebar */}
      <main className="lg:pl-[240px] min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-12 max-w-7xl mx-auto">
          <ErrorBoundary fallbackTitle="Page view rendering issue detected">
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}