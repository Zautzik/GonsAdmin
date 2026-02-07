import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Factory, Package, Gauge, AlertTriangle, Clock,
  RefreshCw, Plus, Eye, FileText, Loader2,
  Minus, User, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useProductionStats,
  useProductionBoard,
  useRealtimeProduction,
  useProductionIssues,
  createProductionReport,
  createProductionIssue,
} from "@/hooks/useProductionTracking";

// ─── Metric Card ───────────────────────────────────────
function MetricCard({
  label, value, icon: Icon, trend, alert, loading, onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  alert?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-10 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-card transition-all duration-200 hover:shadow-md ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-4xl font-semibold tracking-tight">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trend.positive ? "text-green-600" : "text-destructive"}`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
            {alert && (
              <p className="text-xs mt-1 text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Atención
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kanban OT Card ────────────────────────────────────
function KanbanCard({
  wo, onReport, onView,
}: {
  wo: any;
  onReport: (wo: any) => void;
  onView: (wo: any) => void;
}) {
  const progress = wo.quantity > 0 ? Math.round((wo.totalProduced / wo.quantity) * 100) : 0;

  return (
    <Card className="bg-card shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-foreground">OT #{wo.ot_number}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{wo.product_name || "Sin descripción"}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium text-foreground">
              {(wo.totalProduced || 0).toLocaleString()}/{(wo.quantity || 0).toLocaleString()}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right mt-1">{progress}%</p>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          {wo.client_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{wo.client_name}</span>
            </div>
          )}
          {wo.lastReport?.created_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(wo.lastReport.created_at), { addSuffix: true, locale: es })}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onView(wo)}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Ver
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={() => onReport(wo)}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            Reportar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kanban Column ─────────────────────────────────────
function KanbanColumn({
  title, count, children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-3">
        {children}
      </div>
    </div>
  );
}

// ─── Report Sheet ──────────────────────────────────────
function ReportSheet({
  open,
  onOpenChange,
  workOrders,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: any[];
  onSuccess: () => void;
}) {
  const [selectedWOId, setSelectedWOId] = useState("");
  const [unitsProduced, setUnitsProduced] = useState(0);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [hasIssue, setHasIssue] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedWO = workOrders.find((wo) => wo.id === selectedWOId);
  const remaining = selectedWO ? (selectedWO.quantity || 0) - (selectedWO.totalProduced || 0) : 0;

  const handleSubmit = async () => {
    if (!selectedWOId || unitsProduced <= 0) return;

    setLoading(true);
    const timeMinutes = hours * 60 + minutes;

    const result = await createProductionReport({
      work_order_id: selectedWOId,
      units_produced: unitsProduced,
      time_elapsed_minutes: timeMinutes > 0 ? timeMinutes : 60,
    });

    if (result && hasIssue && issueDescription.trim()) {
      await createProductionIssue({
        work_order_id: selectedWOId,
        issue_type: "other",
        severity: "medium",
        description: issueDescription.trim(),
      });
    }

    if (result) {
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedWOId("");
    setUnitsProduced(0);
    setHours(1);
    setMinutes(0);
    setHasIssue(false);
    setIssueDescription("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Reporte Rápido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6 overflow-y-auto">
          {/* OT Select */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Orden de Trabajo</Label>
            <Select value={selectedWOId} onValueChange={setSelectedWOId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Seleccionar OT..." />
              </SelectTrigger>
              <SelectContent>
                {workOrders
                  .filter((wo) => wo.status === "in_production" || wo.status === "approved")
                  .map((wo) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      OT #{wo.ot_number} — {wo.product_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedWO && (
              <p className="text-xs text-muted-foreground">
                Restante: {remaining.toLocaleString()} unidades
              </p>
            )}
          </div>

          {/* Units Produced */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Unidades Producidas</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button" variant="outline" size="icon"
                className="h-12 w-12 shrink-0"
                onClick={() => setUnitsProduced((p) => Math.max(0, p - 100))}
                disabled={unitsProduced < 100}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={unitsProduced}
                onChange={(e) => setUnitsProduced(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center text-3xl font-semibold h-14"
                min={0}
              />
              <Button
                type="button" variant="outline" size="icon"
                className="h-12 w-12 shrink-0"
                onClick={() => setUnitsProduced((p) => p + 100)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000].map((val) => (
                <Button
                  key={val} type="button" variant="secondary" size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setUnitsProduced(val)}
                >
                  {val}
                </Button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Tiempo
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="number" value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center h-12 text-lg"
                  min={0} max={24}
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Horas</p>
              </div>
              <span className="text-xl text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number" value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="text-center h-12 text-lg"
                  min={0} max={59}
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Minutos</p>
              </div>
            </div>
          </div>

          {/* Issue */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="report-issue"
                checked={hasIssue}
                onCheckedChange={(c) => setHasIssue(c === true)}
              />
              <label htmlFor="report-issue" className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-3.5 w-3.5" />
                Reportar problema
              </label>
            </div>
            {hasIssue && (
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe el problema..."
                rows={3}
              />
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t">
          <Button
            className="w-full h-12 text-base gap-2"
            onClick={handleSubmit}
            disabled={loading || !selectedWOId || unitsProduced <= 0}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Reporte
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Dashboard ────────────────────────────────────
export default function ProductionDashboard() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading, refetch: refetchStats } = useProductionStats();
  const { workOrdersWithProgress, loading: boardLoading, refetch: refetchBoard } = useProductionBoard();
  const { issues, refetch: refetchIssues } = useProductionIssues(false);

  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchBoard();
    refetchIssues();
  }, [refetchStats, refetchBoard, refetchIssues]);

  useRealtimeProduction(handleRefresh);

  // Group WOs for Kanban
  const pendingWOs = workOrdersWithProgress.filter((wo) => wo.status === "draft" || wo.status === "approved");
  const inProgressWOs = workOrdersWithProgress.filter((wo) => wo.status === "in_production");
  const completedTodayWOs = workOrdersWithProgress.filter((wo) => {
    if (wo.status !== "completed") return false;
    if (!wo.completed_at) return false;
    return new Date(wo.completed_at).toDateString() === new Date().toDateString();
  });

  const handleView = (wo: any) => navigate(`/ots/${wo.id}`);
  const handleReport = (wo: any) => {
    setReportSheetOpen(true);
  };

  const emptyColumn = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">Sin órdenes</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Panel de Producción</h1>
          <p className="text-sm text-muted-foreground">Seguimiento en tiempo real</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="En Producción"
          value={stats.activeWorkOrders}
          icon={Factory}
          loading={statsLoading}
        />
        <MetricCard
          label="Completadas Hoy"
          value={completedTodayWOs.length}
          icon={Package}
          loading={boardLoading}
        />
        <MetricCard
          label="Eficiencia"
          value={`${stats.currentEfficiency}%`}
          icon={Gauge}
          trend={{
            value: stats.currentEfficiency >= 100 ? "+3%" : "-3%",
            positive: stats.currentEfficiency >= 100,
          }}
          loading={statsLoading}
        />
        <MetricCard
          label="Problemas"
          value={issues.length}
          icon={AlertTriangle}
          alert={issues.length > 0}
          loading={statsLoading}
        />
      </div>

      {/* Kanban Board */}
      {boardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KanbanColumn title="Pendientes" count={pendingWOs.length}>
            {pendingWOs.length === 0
              ? emptyColumn
              : pendingWOs.map((wo) => (
                  <KanbanCard key={wo.id} wo={wo} onReport={handleReport} onView={handleView} />
                ))}
          </KanbanColumn>

          <KanbanColumn title="En Progreso" count={inProgressWOs.length}>
            {inProgressWOs.length === 0
              ? emptyColumn
              : inProgressWOs.map((wo) => (
                  <KanbanCard key={wo.id} wo={wo} onReport={handleReport} onView={handleView} />
                ))}
          </KanbanColumn>

          <KanbanColumn title="Completados Hoy" count={completedTodayWOs.length}>
            {completedTodayWOs.length === 0
              ? emptyColumn
              : completedTodayWOs.map((wo) => (
                  <KanbanCard key={wo.id} wo={wo} onReport={handleReport} onView={handleView} />
                ))}
          </KanbanColumn>
        </div>
      )}

      {/* FAB - Quick Report */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        onClick={() => setReportSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Report Sheet */}
      <ReportSheet
        open={reportSheetOpen}
        onOpenChange={setReportSheetOpen}
        workOrders={workOrdersWithProgress}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
