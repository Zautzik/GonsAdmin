import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Unified data hooks for the consolidated schema

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

export interface WorkOrder {
  id: string;
  ot_number: number;
  client_name: string;
  product_name: string;
  product_description: string | null;
  quantity: number;
  status: string;
  priority: string;
  delivery_date: string | null;
  specifications: any;
  calculations: any;
  unit_price: number | null;
  total_price: number | null;
  cost_budgeted: number | null;
  cost_actual: number | null;
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

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('ot_number', { ascending: false });

    if (error) {
      toast.error('Error fetching work orders');
    } else {
      setWorkOrders(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  return { workOrders, loading, refetch: fetchWorkOrders };
}

// Aggregate statistics hook
export function useProductionStats() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkOrders: 0,
    runningMachines: 0,
    totalMachines: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    
    const [workersRes, workOrdersRes, machinesRes] = await Promise.all([
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase.from('work_orders').select('status'),
      supabase.from('machines').select('status'),
    ]);

    const activeWorkOrders = workOrdersRes.data?.filter(wo => 
      wo.status !== 'completed' && wo.status !== 'delivered' && wo.status !== 'cancelled'
    ).length || 0;
    const runningMachines = machinesRes.data?.filter(m => m.status === 'running').length || 0;

    setStats({
      totalWorkers: workersRes.count || 0,
      activeWorkOrders,
      runningMachines,
      totalMachines: machinesRes.data?.length || 0,
      completedToday: workOrdersRes.data?.filter(wo => wo.status === 'completed').length || 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
