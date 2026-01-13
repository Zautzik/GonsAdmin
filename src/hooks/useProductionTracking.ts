import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";

export interface ProductionReport {
  id: string;
  work_order_id: string | null;
  operation_code: string | null;
  operator_id: string | null;
  machine_id: string | null;
  units_produced: number;
  units_rejected: number | null;
  time_started: string | null;
  time_ended: string | null;
  time_elapsed_minutes: number | null;
  status: string | null;
  notes: string | null;
  reported_via: string | null;
  created_at: string | null;
  work_order?: any;
  operator?: any;
  machine?: any;
}

export interface ProductionIssue {
  id: string;
  production_report_id: string | null;
  work_order_id: string | null;
  issue_type: string;
  severity: string | null;
  description: string;
  reported_by: string | null;
  resolved: boolean | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface ProductionStats {
  activeOTs: number;
  unitsProducedToday: number;
  operatorsWorkingToday: number;
  currentEfficiency: number;
  issuesOpenCount: number;
  reportsToday: number;
}

export function useProductionStats() {
  const [stats, setStats] = useState<ProductionStats>({
    activeOTs: 0,
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

    const [otsRes, reportsRes, issuesRes] = await Promise.all([
      supabase.from("ots").select("id, status").neq("status", "completed"),
      supabase
        .from("production_reports")
        .select("units_produced, operator_id, time_elapsed_minutes")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      supabase.from("production_issues").select("id").eq("resolved", false),
    ]);

    const activeOTs = otsRes.data?.length || 0;
    const reports = reportsRes.data || [];
    const unitsProducedToday = reports.reduce((sum, r) => sum + (r.units_produced || 0), 0);
    const uniqueOperators = new Set(reports.map((r) => r.operator_id).filter(Boolean));
    
    // Calculate efficiency (rough estimation based on time)
    const totalMinutes = reports.reduce((sum, r) => sum + (r.time_elapsed_minutes || 0), 0);
    const expectedMinutes = reports.length * 60; // Assume 60 min per report as baseline
    const currentEfficiency = expectedMinutes > 0 ? Math.round((expectedMinutes / Math.max(totalMinutes, 1)) * 100) : 100;

    setStats({
      activeOTs,
      unitsProducedToday,
      operatorsWorkingToday: uniqueOperators.size,
      currentEfficiency: Math.min(currentEfficiency, 150), // Cap at 150%
      issuesOpenCount: issuesRes.data?.length || 0,
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
  const [otsWithProgress, setOtsWithProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOTsWithProgress = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();

    // Fetch OTs
    const { data: ots, error: otsError } = await supabase
      .from("ots")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (otsError) {
      toast.error("Error loading OTs");
      setLoading(false);
      return;
    }

    // Fetch work orders linked to OTs
    const { data: workOrders } = await supabase
      .from("work_orders")
      .select("id, ot_number, quantity, status, product_name, client_name");

    // Fetch today's production reports
    const { data: reports } = await supabase
      .from("production_reports")
      .select("*, work_order:work_orders(*)")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false });

    // Build OT progress data
    const enrichedOTs = (ots || []).map((ot) => {
      const workOrder = workOrders?.find((wo) => wo.ot_number === parseInt(ot.ot_number.replace("OT-", "")));
      const otReports = reports?.filter((r) => r.work_order?.ot_number === parseInt(ot.ot_number.replace("OT-", ""))) || [];
      const totalProduced = otReports.reduce((sum, r) => sum + (r.units_produced || 0), 0);
      const totalTime = otReports.reduce((sum, r) => sum + (r.time_elapsed_minutes || 0), 0);
      const lastReport = otReports[0];

      return {
        ...ot,
        workOrder,
        totalProduced,
        totalTime,
        progressPercent: ot.quantity > 0 ? Math.min(Math.round((totalProduced / ot.quantity) * 100), 100) : 0,
        lastReport,
        reportsCount: otReports.length,
      };
    });

    setOtsWithProgress(enrichedOTs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOTsWithProgress();
  }, [fetchOTsWithProgress]);

  return { otsWithProgress, loading, refetch: fetchOTsWithProgress };
}

export function useRealtimeProduction(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("production-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_reports" }, () => {
        onUpdate();
        toast.info("📊 Nuevo reporte de producción recibido");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "production_issues" }, (payload) => {
        onUpdate();
        if (payload.eventType === "INSERT") {
          const issue = payload.new as ProductionIssue;
          if (issue.severity === "critical" || issue.severity === "high") {
            toast.error(`⚠️ Problema reportado: ${issue.description.substring(0, 50)}...`);
          } else {
            toast.warning(`⚠️ Problema reportado: ${issue.description.substring(0, 50)}...`);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ots" }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}

export function useProductionReports(workOrderId?: string) {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("production_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (workOrderId) {
      query = query.eq("work_order_id", workOrderId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading production reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}

export function useProductionIssues(resolved?: boolean) {
  const [issues, setIssues] = useState<ProductionIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("production_issues")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (resolved !== undefined) {
      query = query.eq("resolved", resolved);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading issues");
    } else {
      setIssues(data || []);
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
    .from("production_reports")
    .insert({
      ...report,
      status: "completed",
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
  production_report_id?: string;
  issue_type: "machine_breakdown" | "material_defect" | "quality_issue" | "shortage" | "other";
  severity: string;
  description: string;
  reported_by?: string;
}) {
  const { data, error } = await supabase
    .from("production_issues")
    .insert({
      work_order_id: issue.work_order_id,
      production_report_id: issue.production_report_id,
      issue_type: issue.issue_type,
      severity: issue.severity as any,
      description: issue.description,
      reported_by: issue.reported_by,
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
    .from("production_issues")
    .update({
      resolved: true,
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
