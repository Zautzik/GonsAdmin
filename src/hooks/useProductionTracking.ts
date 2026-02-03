import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";

// Using the new consolidated production_activity table

export interface ProductionActivity {
  id: string;
  work_order_id: string | null;
  operation_id: string | null;
  machine_id: string | null;
  activity_type: 'report' | 'issue' | 'note';
  units_produced: number | null;
  units_rejected: number | null;
  time_started: string | null;
  time_ended: string | null;
  time_elapsed_minutes: number | null;
  issue_type: string | null;
  severity: string | null;
  is_resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  operator_id: string | null;
  description: string | null;
  notes: string | null;
  reported_via: string | null;
  created_at: string | null;
}

export interface ProductionStats {
  activeWorkOrders: number;
  unitsProducedToday: number;
  operatorsWorkingToday: number;
  currentEfficiency: number;
  issuesOpenCount: number;
  reportsToday: number;
}

export function useProductionStats() {
  const [stats, setStats] = useState<ProductionStats>({
    activeWorkOrders: 0,
    unitsProducedToday: 0,
    operatorsWorkingToday: 0,
    currentEfficiency: 0,
    issuesOpenCount: 0,
    reportsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const [workOrdersRes, activityRes] = await Promise.all([
      supabase.from("work_orders").select("id, status").neq("status", "completed").neq("status", "delivered").neq("status", "cancelled"),
      supabase
        .from("production_activity")
        .select("*")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
    ]);

    const activeWorkOrders = workOrdersRes.data?.length || 0;
    const activities = activityRes.data || [];
    
    const reports = activities.filter(a => a.activity_type === 'report');
    const issues = activities.filter(a => a.activity_type === 'issue' && !a.is_resolved);
    
    const unitsProducedToday = reports.reduce((sum, r) => sum + (r.units_produced || 0), 0);
    const uniqueOperators = new Set(reports.map((r) => r.operator_id).filter(Boolean));
    
    const totalMinutes = reports.reduce((sum, r) => sum + (r.time_elapsed_minutes || 0), 0);
    const expectedMinutes = reports.length * 60;
    const currentEfficiency = expectedMinutes > 0 ? Math.round((expectedMinutes / Math.max(totalMinutes, 1)) * 100) : 100;

    setStats({
      activeWorkOrders,
      unitsProducedToday,
      operatorsWorkingToday: uniqueOperators.size,
      currentEfficiency: Math.min(currentEfficiency, 150),
      issuesOpenCount: issues.length,
      reportsToday: reports.length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export function useProductionBoard() {
  const [workOrdersWithProgress, setWorkOrdersWithProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrdersWithProgress = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();

    const { data: workOrders, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("ot_number", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Error loading work orders");
      setLoading(false);
      return;
    }

    const { data: activities } = await supabase
      .from("production_activity")
      .select("*")
      .eq("activity_type", "report")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false });

    const enrichedWorkOrders = (workOrders || []).map((wo) => {
      const woActivities = activities?.filter((a) => a.work_order_id === wo.id) || [];
      const totalProduced = woActivities.reduce((sum, a) => sum + (a.units_produced || 0), 0);
      const totalTime = woActivities.reduce((sum, a) => sum + (a.time_elapsed_minutes || 0), 0);
      const lastReport = woActivities[0];

      return {
        ...wo,
        totalProduced,
        totalTime,
        progressPercent: wo.quantity > 0 ? Math.min(Math.round((totalProduced / wo.quantity) * 100), 100) : 0,
        lastReport,
        reportsCount: woActivities.length,
      };
    });

    setWorkOrdersWithProgress(enrichedWorkOrders);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkOrdersWithProgress();
  }, [fetchWorkOrdersWithProgress]);

  return { workOrdersWithProgress, loading, refetch: fetchWorkOrdersWithProgress };
}

export function useRealtimeProduction(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("production-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_activity" }, (payload) => {
        onUpdate();
        if (payload.eventType === "INSERT") {
          const activity = payload.new as ProductionActivity;
          if (activity.activity_type === 'report') {
            toast.info("📊 Nuevo reporte de producción recibido");
          } else if (activity.activity_type === 'issue') {
            if (activity.severity === "critical" || activity.severity === "high") {
              toast.error(`⚠️ Problema reportado: ${activity.description?.substring(0, 50)}...`);
            } else {
              toast.warning(`⚠️ Problema reportado: ${activity.description?.substring(0, 50)}...`);
            }
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}

export function useProductionReports(workOrderId?: string) {
  const [reports, setReports] = useState<ProductionActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("production_activity")
      .select("*")
      .eq("activity_type", "report")
      .order("created_at", { ascending: false })
      .limit(100);

    if (workOrderId) {
      query = query.eq("work_order_id", workOrderId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading production reports");
    } else {
      setReports((data || []) as ProductionActivity[]);
    }
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}

export function useProductionIssues(resolved?: boolean) {
  const [issues, setIssues] = useState<ProductionActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("production_activity")
      .select("*")
      .eq("activity_type", "issue")
      .order("created_at", { ascending: false })
      .limit(50);

    if (resolved !== undefined) {
      query = query.eq("is_resolved", resolved);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading issues");
    } else {
      setIssues((data || []) as ProductionActivity[]);
    }
    setLoading(false);
  }, [resolved]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, loading, refetch: fetchIssues };
}

export async function createProductionReport(report: {
  work_order_id: string;
  units_produced: number;
  time_elapsed_minutes: number;
  operator_id?: string;
  machine_id?: string;
  notes?: string;
  units_rejected?: number;
}) {
  const { data, error } = await supabase
    .from("production_activity")
    .insert({
      work_order_id: report.work_order_id,
      activity_type: 'report',
      units_produced: report.units_produced,
      units_rejected: report.units_rejected || 0,
      time_elapsed_minutes: report.time_elapsed_minutes,
      operator_id: report.operator_id,
      machine_id: report.machine_id,
      notes: report.notes,
      reported_via: "web",
      time_ended: new Date().toISOString(),
      time_started: new Date(Date.now() - report.time_elapsed_minutes * 60000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    toast.error("Error al crear reporte: " + error.message);
    return null;
  }

  toast.success("✅ Reporte de producción creado");
  return data;
}

export async function createProductionIssue(issue: {
  work_order_id?: string;
  issue_type: "machine_breakdown" | "material_defect" | "quality" | "delay" | "other";
  severity: string;
  description: string;
  operator_id?: string;
}) {
  const { data, error } = await supabase
    .from("production_activity")
    .insert({
      work_order_id: issue.work_order_id,
      activity_type: 'issue',
      issue_type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      operator_id: issue.operator_id,
      is_resolved: false,
      reported_via: "web",
    })
    .select()
    .single();

  if (error) {
    toast.error("Error al reportar problema: " + error.message);
    return null;
  }

  toast.success("⚠️ Problema reportado. Supervisor notificado.");
  return data;
}

export async function resolveProductionIssue(issueId: string, resolutionNotes: string) {
  const { error } = await supabase
    .from("production_activity")
    .update({
      is_resolved: true,
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", issueId);

  if (error) {
    toast.error("Error al resolver problema");
    return false;
  }

  toast.success("✅ Problema resuelto");
  return true;
}
