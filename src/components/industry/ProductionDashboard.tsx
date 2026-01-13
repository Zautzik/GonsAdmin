import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Factory, Package, Users, Gauge, AlertTriangle, Clock, 
  RefreshCw, Eye, FileWarning, ChevronRight, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useProductionStats, useProductionBoard, useRealtimeProduction, useProductionIssues } from "@/hooks/useProductionTracking";
import { Skeleton } from "@/components/ui/skeleton";
import ProductionReportDialog from "./ProductionReportDialog";
import IssueReportDialog from "./IssueReportDialog";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pendiente", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  in_progress: { label: "En Progreso", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  in_production: { label: "En Producción", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  completed: { label: "Completado", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  on_hold: { label: "En Espera", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
};

function StatCard({ title, value, icon: Icon, subtitle, trend, loading }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className={`text-xs ${trend ? trendColors[trend] : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OTCard({ ot, onReport, onIssue }: { ot: any; onReport: () => void; onIssue: () => void }) {
  const navigate = useNavigate();
  const status = statusConfig[ot.status] || statusConfig.pending;
  const progressColor = ot.progressPercent >= 75 ? "bg-success" : ot.progressPercent >= 50 ? "bg-warning" : "bg-primary";

  // Determine time status
  const timeSpent = ot.totalTime || 0;
  const estimatedTime = 480; // 8 hours in minutes as baseline
  const timeEfficiency = estimatedTime > 0 ? (estimatedTime / Math.max(timeSpent, 1)) * 100 : 100;
  const timeStatus = timeEfficiency >= 100 ? "good" : timeEfficiency >= 75 ? "warning" : "bad";
  const timeColors = { good: "text-success", warning: "text-warning", bad: "text-destructive" };

  return (
    <Card className="card-hover group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div 
            className="cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/ots/${ot.id}`)}
          >
            <h3 className="font-bold text-lg">{ot.ot_number}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">{ot.description || "Sin descripción"}</p>
          </div>
          <Badge className={`${status.bgColor} ${status.color} border-0`}>{status.label}</Badge>
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          <p className="truncate">{ot.client_name}</p>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{ot.totalProduced?.toLocaleString() || 0}/{ot.quantity?.toLocaleString() || 0}</span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all`} style={{ width: `${ot.progressPercent || 0}%` }} />
          </div>
          <p className="text-xs text-right text-muted-foreground mt-0.5">{ot.progressPercent || 0}%</p>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className={timeColors[timeStatus]}>
              {Math.floor(timeSpent / 60)}h {timeSpent % 60}m
            </span>
          </div>
          {ot.lastReport && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(ot.lastReport.created_at), { addSuffix: true, locale: es })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="default" className="flex-1" onClick={onReport}>
            <Package className="h-3.5 w-3.5 mr-1" />
            Reportar
          </Button>
          <Button size="sm" variant="outline" onClick={onIssue}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/ots/${ot.id}`)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ title, icon: Icon, ots, color, onReport, onIssue }: {
  title: string;
  icon: React.ElementType;
  ots: any[];
  color: string;
  onReport: (ot: any) => void;
  onIssue: (ot: any) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 p-3 rounded-t-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
        <h3 className="font-semibold text-white">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{ots.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-2 bg-muted/30 rounded-b-lg min-h-[400px]">
        <div className="space-y-3">
          {ots.map((ot) => (
            <OTCard 
              key={ot.id} 
              ot={ot} 
              onReport={() => onReport(ot)}
              onIssue={() => onIssue(ot)}
            />
          ))}
          {ots.length === 0 && (
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
  const { stats, loading: statsLoading, refetch: refetchStats } = useProductionStats();
  const { otsWithProgress, loading: boardLoading, refetch: refetchBoard } = useProductionBoard();
  const { issues, loading: issuesLoading, refetch: refetchIssues } = useProductionIssues(false);
  
  const [selectedOT, setSelectedOT] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchBoard();
    refetchIssues();
  }, [refetchStats, refetchBoard, refetchIssues]);

  // Real-time updates
  useRealtimeProduction(handleRefresh);

  // Group OTs by status for Kanban
  const pendingOTs = otsWithProgress.filter((ot) => ot.status === "pending" || ot.status === "on_hold");
  const inProgressOTs = otsWithProgress.filter((ot) => ot.status === "in_progress" || ot.status === "in_production");
  const completedTodayOTs = otsWithProgress.filter((ot) => {
    if (ot.status !== "completed") return false;
    if (!ot.completed_at) return false;
    const completedDate = new Date(ot.completed_at);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  });

  const handleOpenReport = (ot: any) => {
    setSelectedOT(ot);
    setReportDialogOpen(true);
  };

  const handleOpenIssue = (ot: any) => {
    setSelectedOT(ot);
    setIssueDialogOpen(true);
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
          value={stats.activeOTs}
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
          trend={stats.currentEfficiency >= 100 ? "up" : stats.currentEfficiency >= 80 ? "neutral" : "down"}
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
                ots={pendingOTs}
                color="bg-yellow-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
              />
              <KanbanColumn
                title="En Progreso"
                icon={Factory}
                ots={inProgressOTs}
                color="bg-blue-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
              />
              <KanbanColumn
                title="Completado Hoy"
                icon={Package}
                ots={completedTodayOTs}
                color="bg-green-500"
                onReport={handleOpenReport}
                onIssue={handleOpenIssue}
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
                {otsWithProgress
                  .filter((ot) => ot.status !== "completed")
                  .map((ot) => (
                    <OTCard
                      key={ot.id}
                      ot={ot}
                      onReport={() => handleOpenReport(ot)}
                      onIssue={() => handleOpenIssue(ot)}
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
        ot={selectedOT}
        onSuccess={handleRefresh}
      />

      <IssueReportDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        ot={selectedOT}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
