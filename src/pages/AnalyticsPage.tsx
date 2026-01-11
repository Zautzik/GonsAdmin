import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';

const CostAnalyticsDashboard = lazy(() => import('@/components/analytics/CostAnalyticsDashboard'));

export default function AnalyticsPage() {
  const { canViewAnalytics } = usePermissions();

  if (!canViewAnalytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
              <p className="text-muted-foreground">
                No tienes permisos para ver los analytics. Contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="space-y-6 p-6 animate-pulse">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      }>
        <CostAnalyticsDashboard />
      </Suspense>
    </DashboardLayout>
  );
}
