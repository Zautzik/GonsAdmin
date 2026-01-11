import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";
import Login from "./pages/Login";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import WorkflowDashboard from "./pages/WorkflowDashboard";
import FinancialReport from "./pages/FinancialReport";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import NotFound from "./pages/NotFound";

// Lazy load new pages
const OTPage = lazy(() => import("./pages/OTPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AdminConfigPage = lazy(() => import("./pages/AdminConfigPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="p-8 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/dashboard" element={<UnifiedDashboard />} />
                  <Route path="/supervisor" element={<UnifiedDashboard />} />
                  <Route path="/manager" element={<UnifiedDashboard />} />
                  <Route path="/admin" element={<UnifiedDashboard />} />
                  <Route path="/workflow" element={<WorkflowDashboard />} />
                  <Route path="/financial" element={<FinancialReport />} />
                  <Route path="/maintenance" element={<MaintenanceDashboard />} />
                  {/* OT Module Routes */}
                  <Route path="/ots/*" element={<OTPage />} />
                  {/* Analytics */}
                  <Route path="/analytics/*" element={<AnalyticsPage />} />
                  {/* Admin Config */}
                  <Route path="/admin/config" element={<AdminConfigPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
