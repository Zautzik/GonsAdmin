import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load industry components
const ProductionDashboard = lazy(() => import("@/components/industry/ProductionDashboard"));
const OperatorView = lazy(() => import("@/components/industry/OperatorView"));
const MobileOperatorView = lazy(() => import("@/components/industry/MobileOperatorView"));
const InventoryDashboard = lazy(() => import("@/components/industry/InventoryDashboard"));
const ScanningInterface = lazy(() => import("@/components/industry/ScanningInterface"));
const ControlCenter = lazy(() => import("@/components/industry/ControlCenter"));

// Procurement components
const ProcurementDashboard = lazy(() => import("@/components/industry/procurement/ProcurementDashboard"));
const MRPCalculator = lazy(() => import("@/components/industry/procurement/MRPCalculator"));
const PurchaseOrdersList = lazy(() => import("@/components/industry/procurement/PurchaseOrdersList"));
const PurchaseOrderDetail = lazy(() => import("@/components/industry/procurement/PurchaseOrderDetail"));
const CreatePurchaseOrder = lazy(() => import("@/components/industry/procurement/CreatePurchaseOrder"));
const SupplierManagement = lazy(() => import("@/components/industry/procurement/SupplierManagement"));

// Analytics components
const ProductionAnalytics = lazy(() => import("@/components/industry/analytics/ProductionAnalytics"));
const InventoryAnalytics = lazy(() => import("@/components/industry/analytics/InventoryAnalytics"));
const ProcurementAnalytics = lazy(() => import("@/components/industry/analytics/ProcurementAnalytics"));

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
          {/* Main Routes */}
          <Route path="/" element={<Navigate to="control-center" replace />} />
          <Route path="control-center" element={<ControlCenter />} />
          <Route path="production" element={<ProductionDashboard />} />
          <Route path="operator" element={<OperatorView />} />
          <Route path="mobile" element={<MobileOperatorView />} />
          
          {/* Inventory Routes */}
          <Route path="inventory" element={<InventoryDashboard />} />
          <Route path="scan" element={<ScanningInterface />} />
          
          {/* Procurement Routes */}
          <Route path="procurement" element={<ProcurementDashboard />} />
          <Route path="procurement/mrp" element={<MRPCalculator />} />
          <Route path="procurement/purchase-orders" element={<PurchaseOrdersList />} />
          <Route path="procurement/purchase-orders/create" element={<CreatePurchaseOrder />} />
          <Route path="procurement/purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="procurement/suppliers" element={<SupplierManagement />} />
          
          {/* Analytics Routes */}
          <Route path="analytics/production" element={<ProductionAnalytics />} />
          <Route path="analytics/inventory" element={<InventoryAnalytics />} />
          <Route path="analytics/procurement" element={<ProcurementAnalytics />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
