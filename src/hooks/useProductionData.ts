import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Unified data hooks for consistency across the application

export interface Worker {
  id: string;
  name: string;
  department: string;
  specialty: string[] | null;
  worker_role: string | null;
  phone: string | null;
  worker_code: string | null;
  quality_score: number | null;
  speed_score: number | null;
  overall_rating: number | null;
  attendance_score: number | null;
  overtime_availability: boolean | null;
}

export interface Workstation {
  id: string;
  name: string;
  type: string;
  status: string;
  max_workers: number;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface OT {
  id: string;
  ot_number: string;
  client_name: string;
  description: string | null;
  quantity: number;
  status: string;
  priority: number;
  deadline: string | null;
  created_at: string;
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Error fetching workers');
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return { workers, loading, refetch: fetchWorkers };
}

export function useWorkstations() {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkstations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Error fetching workstations');
    } else {
      setWorkstations(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkstations();
  }, [fetchWorkstations]);

  return { workstations, loading, refetch: fetchWorkstations };
}

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Error fetching machines');
    } else {
      setMachines(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  return { machines, loading, refetch: fetchMachines };
}

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time');

    if (error) {
      toast.error('Error fetching shifts');
    } else {
      setShifts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, loading, refetch: fetchShifts };
}

export function useOTs() {
  const [ots, setOts] = useState<OT[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOTs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ots')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error fetching work orders');
    } else {
      setOts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOTs();
  }, [fetchOTs]);

  return { ots, loading, refetch: fetchOTs };
}

// Aggregate statistics hook
export function useProductionStats() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeOTs: 0,
    runningMachines: 0,
    totalMachines: 0,
    pendingSubmissions: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    
    const [workersRes, otsRes, machinesRes, submissionsRes] = await Promise.all([
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase.from('ots').select('status'),
      supabase.from('machines').select('status'),
      supabase.from('progress_submissions').select('status').eq('status', 'pending'),
    ]);

    const activeOTs = otsRes.data?.filter(ot => ot.status !== 'completed').length || 0;
    const runningMachines = machinesRes.data?.filter(m => m.status === 'running').length || 0;

    setStats({
      totalWorkers: workersRes.count || 0,
      activeOTs,
      runningMachines,
      totalMachines: machinesRes.data?.length || 0,
      pendingSubmissions: submissionsRes.data?.length || 0,
      completedToday: otsRes.data?.filter(ot => ot.status === 'completed').length || 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}