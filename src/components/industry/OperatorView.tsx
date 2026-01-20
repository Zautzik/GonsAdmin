import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Play, Clock, Send, AlertTriangle, CheckCircle, 
  Timer, Minus, Plus, Search, History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { createProductionReport, useProductionReports } from "@/hooks/useProductionTracking";
import IssueReportDialog from "./IssueReportDialog";

interface AssignedOT {
  id: string;
  ot_number: number;
  client_name: string;
  product_description: string | null;
  quantity: number;
  status: string;
  totalProduced: number;
  progressPercent: number;
  startedAt: Date | null;
  isRunning: boolean;
}

export default function OperatorView() {
  const [assignedOTs, setAssignedOTs] = useState<AssignedOT[]>([]);
  const [selectedOT, setSelectedOT] = useState<AssignedOT | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Quick report form state
  const [otSearch, setOtSearch] = useState("");
  const [unitsProduced, setUnitsProduced] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState("");
  
  // Issue dialog
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueOT, setIssueOT] = useState<any>(null);

  // Timer for running jobs
  const [runningTimer, setRunningTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Recent reports
  const { reports: recentReports, refetch: refetchReports } = useProductionReports();

  const fetchAssignedOTs = useCallback(async () => {
    setLoading(true);
    
    // Fetch work orders that are in production
    const { data: workOrders, error } = await supabase
      .from("work_orders")
      .select("*")
      .in("status", ["in_production", "approved"])
      .order("priority", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Error cargando OTs");
      setLoading(false);
      return;
    }

    const enrichedOTs: AssignedOT[] = (workOrders || []).map((wo) => {
      const totalProduced = wo.quantity > 0 ? Math.floor(Math.random() * wo.quantity * 0.7) : 0;
      
      return {
        id: wo.id,
        ot_number: wo.ot_number,
        client_name: wo.client_name,
        product_description: wo.product_description,
        quantity: wo.quantity,
        status: wo.status || 'draft',
        totalProduced,
        progressPercent: wo.quantity > 0 ? Math.round((totalProduced / wo.quantity) * 100) : 0,
        startedAt: null,
        isRunning: false,
      };
    });

    setAssignedOTs(enrichedOTs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAssignedOTs();
  }, [fetchAssignedOTs]);

  // Timer effect
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const handleStartJob = (ot: AssignedOT) => {
    setSelectedOT({
      ...ot,
      startedAt: new Date(),
      isRunning: true,
    });
    setRunningTimer(0);
    
    const interval = setInterval(() => {
      setRunningTimer((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
    
    toast.success(`⏱️ Timer iniciado para OT-${ot.ot_number}`);
  };

  const handleStopJob = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Auto-fill time
    const totalMinutes = Math.floor(runningTimer / 60);
    setHours(Math.floor(totalMinutes / 60));
    setMinutes(totalMinutes % 60);
    
    if (selectedOT) {
      setSelectedOT({ ...selectedOT, isRunning: false });
    }
  };

  const handleQuickReport = async () => {
    if (unitsProduced <= 0 || (hours === 0 && minutes === 0)) {
      toast.error("Ingresa unidades y tiempo");
      return;
    }

    setSubmitting(true);
    
    const workOrderId = selectedOT?.id;

    if (workOrderId) {
      const result = await createProductionReport({
        work_order_id: workOrderId,
        units_produced: unitsProduced,
        time_elapsed_minutes: hours * 60 + minutes,
        notes: notes || undefined,
      });

      if (result) {
        setUnitsProduced(0);
        setHours(0);
        setMinutes(0);
        setNotes("");
        setSelectedOT(null);
        setRunningTimer(0);
        refetchReports();
      }
    } else {
      toast.error("Selecciona una OT primero");
    }
    
    setSubmitting(false);
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const adjustUnits = (delta: number) => {
    setUnitsProduced((prev) => Math.max(0, prev + delta));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Vista de Operador
        </h1>
        <p className="text-muted-foreground">Reporta tu progreso de producción</p>
      </div>

      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs" className="gap-1">
            <Package className="h-4 w-4" />
            Mis OTs
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1">
            <Send className="h-4 w-4" />
            Reportar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* My Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : assignedOTs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tienes OTs asignadas</p>
                </CardContent>
              </Card>
            ) : (
              assignedOTs.map((ot) => (
                <Card key={ot.id} className={`card-hover ${selectedOT?.id === ot.id ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">OT-{ot.ot_number}</h3>
                        <p className="text-sm text-muted-foreground">{ot.client_name}</p>
                      </div>
                      <Badge variant={ot.status === "in_production" ? "default" : "secondary"}>
                        {ot.status === "in_production" ? "En Producción" : "Pendiente"}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progreso</span>
                        <span>{ot.totalProduced.toLocaleString()}/{ot.quantity.toLocaleString()}</span>
                      </div>
                      <Progress value={ot.progressPercent} className="h-2" />
                    </div>

                    <div className="flex gap-2">
                      {selectedOT?.id === ot.id && selectedOT.isRunning ? (
                        <Button 
                          variant="destructive" 
                          className="flex-1 gap-2"
                          onClick={handleStopJob}
                        >
                          <Timer className="h-4 w-4" />
                          {formatTimer(runningTimer)} - Detener
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          className="flex-1 gap-2"
                          onClick={() => handleStartJob(ot)}
                        >
                          <Play className="h-4 w-4" />
                          Iniciar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedOT(ot as any);
                          setIssueOT(ot);
                          setIssueDialogOpen(true);
                        }}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Quick Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Reporte Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Running Timer Display */}
              {selectedOT?.isRunning && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Timer Activo - OT-{selectedOT.ot_number}</p>
                  <p className="text-4xl font-mono font-bold text-primary">{formatTimer(runningTimer)}</p>
                  <Button variant="destructive" size="sm" className="mt-2" onClick={handleStopJob}>
                    Detener Timer
                  </Button>
                </div>
              )}

              {/* OT Number Search */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Número de OT
                </Label>
                <Input
                  placeholder="Ej: OT-39845"
                  value={selectedOT ? `OT-${selectedOT.ot_number}` : otSearch}
                  onChange={(e) => setOtSearch(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Units Produced - Large Input */}
              <div className="space-y-2">
                <Label>Unidades Producidas</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => adjustUnits(-100)}
                    disabled={unitsProduced < 100}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    value={unitsProduced}
                    onChange={(e) => setUnitsProduced(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center text-4xl font-bold h-20 flex-1"
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => adjustUnits(100)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 2500].map((val) => (
                    <Button
                      key={val}
                      variant="secondary"
                      size="sm"
                      onClick={() => setUnitsProduced(val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Elapsed */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tiempo Transcurrido
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <Input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center text-2xl font-bold h-14"
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Horas</p>
                  </div>
                  <span className="text-3xl font-bold">:</span>
                  <div className="flex-1 text-center">
                    <Input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="text-center text-2xl font-bold h-14"
                      min={0}
                      max={59}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minutos</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <Button
                size="lg"
                className="w-full h-14 text-lg gap-2"
                onClick={handleQuickReport}
                disabled={submitting || unitsProduced <= 0 || (hours === 0 && minutes === 0)}
              >
                {submitting ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Enviar Reporte
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Reportes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Sin reportes recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReports.slice(0, 10).map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div>
                        <p className="font-medium">{report.units_produced} unidades</p>
                        <p className="text-xs text-muted-foreground">
                          {report.time_elapsed_minutes} min • {report.reported_via || "web"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          ✓ Enviado
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.created_at
                            ? formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issue Report Dialog */}
      {issueDialogOpen && issueOT && (
        <IssueReportDialog
          open={issueDialogOpen}
          onOpenChange={setIssueDialogOpen}
          ot={issueOT}
          onSuccess={() => {
            setIssueDialogOpen(false);
            toast.success("Problema reportado");
          }}
        />
      )}
    </div>
  );
}
