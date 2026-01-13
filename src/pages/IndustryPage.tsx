import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load industry components
const ProductionDashboard = lazy(() => import("@/components/industry/ProductionDashboard"));
const OperatorView = lazy(() => import("@/components/industry/OperatorView"));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <Skeleton className="h-96" />
  </div>
);

export default function IndustryPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="production" replace />} />
          <Route path="production" element={<ProductionDashboard />} />
          <Route path="operator" element={<OperatorView />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
