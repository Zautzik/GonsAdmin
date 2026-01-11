import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Lazy load OT components
const OTDashboard = lazy(() => import('@/components/ot/OTDashboard'));
const OTCreateForm = lazy(() => import('@/components/ot/OTCreateForm'));
const OTDetailView = lazy(() => import('@/components/ot/OTDetailView'));
const OTPDFPage = lazy(() => import('@/components/ot/OTPDFPage'));
const OTTemplates = lazy(() => import('@/components/ot/OTTemplates'));

const PageSkeleton = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-96" />
  </div>
);

export default function OTPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OTDashboard />} />
          <Route path="create" element={<OTCreateForm />} />
          <Route path="templates" element={<OTTemplates />} />
          <Route path=":id" element={<OTDetailView />} />
          <Route path=":id/pdf" element={<OTPDFPage />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
