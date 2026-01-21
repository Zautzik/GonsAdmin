import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Factory, Package, Users, Gauge, Clock, 
  RefreshCw, FileWarning, ChevronRight, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionStats, useProductionBoard, useRealtimeProduction, useProductionIssues } from "@/hooks/useProductionTracking";
import { StatCard } from "./shared/StatCard";
import { ProductionCard } from "./ProductionCard";
import { Skeleton } from "@/components/ui/skeleton";
import ProductionReportDialog from "./ProductionReportDialog";
import IssueReportDialog from "./IssueReportDialog";

function KanbanColumn({ title, icon: Icon, workOrders, color, onReport, onIssue, onView }: {
  title: string;
  icon: React.ElementType;
  workOrders: any[];
  color: string;
  onReport: (wo: any) => void;
  onIssue: (wo: any) => void;
  onView: (wo: any) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 p-3 rounded-t-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
        <h3 className="font-semibold text-white">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{workOrders.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-2 bg-muted/30 rounded-b-lg min-h-[400px]">
        <div className="space-y-3">
          {workOrders.map((wo) => (
            <ProductionCard
              key={wo.id}
              id={wo.id}
              otNumber={wo.ot_number}
              productName={wo.product_name || "Sin descripción"}
              clientName={wo.client_name}
              quantity={wo.quantity || 0}
              produced={wo.totalProduced || 0}
              status={wo.status}
              lastUpdate={wo.lastReport?.created_at}
              timeSpentMinutes={wo.totalTime || 0}
              onReport={() => onReport(wo)}
              onIssue={() => onIssue(wo)}
              onViewDetails={() => onView(wo)}
            />
          ))}
          {workOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin OTs</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function ProductionDashboard() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading, refetch: refetchStats } = useProductionStats();
  const { workOrdersWithProgress, loading: boardLoading, refetch: refetchBoard } = useProductionBoard();
  const { issues, loading: issuesLoading, refetch: refetchIssues } = useProductionIssues(false);
  
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchBoard();
    refetchIssues();
  }, [refetchStats, refetchBoard, refetchIssues]);

  // Real-time updates
  useRealtimeProduction(handleRefresh);

  // Group work orders by status for Kanban
  const pendingWOs = workOrdersWithProgress.filter((wo) => wo.status === "draft" || wo.status === "approved");
  const inProgressWOs = workOrdersWithProgress.filter((wo) => wo.status === "in_production");
  const completedTodayWOs = workOrdersWithProgress.filter((wo) => {
    if (wo.status !== "completed") return false;
    if (!wo.completed_at) return false;
    const completedDate = new Date(wo.completed_at);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  });

  const handleOpenReport = (wo: any) => {
    setSelectedWO(wo);
    setReportDialogOpen(true);
  };

  const handleOpenIssue = (wo: any) => {
    setSelectedWO(wo);
    setIssueDialogOpen(true);
  };

  const handleViewDetails = (wo: any) => {
    navigate(`/ots/${wo.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-7 w-7 text-primary" />
            Panel de Producción
          </h1>
          <p className="text-muted-foreground">Seguimiento en tiempo real de la producción</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="OTs Activas"
          value={stats.activeWorkOrders}
          icon={Package}
          loading={statsLoading}
        />
        <StatCard
          title="Unidades Hoy"
          value={stats.unitsProducedToday.toLocaleString()}
          icon={Factory}
          subtitle={`${stats.reportsToday} reportes`}
          loading={statsLoading}
        />
        <StatCard
          title="Operadores Activos"
          value={stats.operatorsWorkingToday}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Eficiencia"
          value={`${stats.currentEfficiency}%`}
          icon={Gauge}
          trend={{
            value: stats.currentEfficiency >= 100 ? "+5%" : "-3%",
            isPositive: stats.currentEfficiency >= 100
          }}
          loading={statsLoading}
        />
      </div>

      {/* Issues Alert */}
      {issues.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <FileWarning className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-destructive">{issues.length} problemas sin resolver</p>
                <p className="text-sm text-muted-foreground">{issues[0]?.description?.substring(0, 60)}...</p>
              </div>
              <Button variant="destructive" size="sm">
                Ver Problemas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-2">
            <Zap className="h-4 w-4" />
            Tablero Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <Package className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-0">
          {boardLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-48 rounded-lg" />
                  <Skeleton className="h-48 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KanbanColumn
                title="Pendiente"
                icon={Clock}
                workOrders={pendingWOs}
                color="bg-yellow-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
                onView={handleViewDetails}
              />
              <KanbanColumn
                title="En Progreso"
                icon={Factory}
                workOrders={inProgressWOs}
                color="bg-blue-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
                onView={handleViewDetails}
              />
              <KanbanColumn
                title="Completado Hoy"
                icon={Package}
                workOrders={completedTodayWOs}
                color="bg-green-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
                onView={handleViewDetails}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Todas las OTs Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {workOrdersWithProgress
                  .filter((wo) => wo.status !== "completed" && wo.status !== "delivered")
                  .map((wo) => (
                    <ProductionCard
                      key={wo.id}
                      id={wo.id}
                      otNumber={wo.ot_number}
                      productName={wo.product_name || "Sin descripción"}
                      clientName={wo.client_name}
                      quantity={wo.quantity || 0}
                      produced={wo.totalProduced || 0}
                      status={wo.status}
                      lastUpdate={wo.lastReport?.created_at}
                      timeSpentMinutes={wo.totalTime || 0}
                      onReport={() => handleOpenReport(wo)}
                      onIssue={() => handleOpenIssue(wo)}
                      onViewDetails={() => handleViewDetails(wo)}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProductionReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        ot={selectedWO}
        onSuccess={handleRefresh}
      />

      <IssueReportDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        ot={selectedWO}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
