import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkstationLayout } from "@/components/workflow/WorkstationLayout";
import { WorkerStatsPanel } from "@/components/workflow/WorkerStatsPanel";
import { ShiftManagement } from "@/components/workflow/ShiftManagement";
import { Users, Factory, Clock, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * WorkflowDashboard - Main dashboard for managing workshop workflow
 * Inspired by FIFA squad management interface
 * Features: workstation assignments, worker stats, shift management
 */
export default function WorkflowDashboard() {
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("morning");
  const { toast } = useToast();

  // Fetch all data on component mount
  useEffect(() => {
    fetchWorkers();
    fetchWorkstations();
    fetchAssignments();
  }, [selectedShift]);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("overall_rating", { ascending: false });

    if (error) {
      toast({ title: "Error fetching workers", variant: "destructive" });
      return;
    }
    setWorkers(data || []);
  };

  const fetchWorkstations = async () => {
    const { data, error } = await supabase
      .from("workstations")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error fetching workstations", variant: "destructive" });
      return;
    }
    setWorkstations(data || []);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("worker_assignments")
      .select(`
        *,
        worker:workers(*),
        workstation:workstations(*),
        shift:shifts(*)
      `)
      .eq("date", new Date().toISOString().split("T")[0]);

    if (error) {
      toast({ title: "Error fetching assignments", variant: "destructive" });
      return;
    }
    setAssignments(data || []);
  };

  const handleWorkerSelect = (worker: any) => {
    setSelectedWorker(worker);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Workshop Management</h1>
          <p className="text-blue-200">Dynamic Workflow & Performance Tracking</p>
        </div>
        <div className="flex gap-2">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              <span className="text-sm">{workers.length} Workers</span>
            </div>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 text-white">
              <Factory className="w-5 h-5" />
              <span className="text-sm">{workstations.length} Stations</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="bg-white/10 border-white/20 backdrop-blur-sm">
          <TabsTrigger value="layout" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Factory className="w-4 h-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="shifts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workstation Layout - Left Side (2/3) */}
            <div className="lg:col-span-2">
              <WorkstationLayout
                workstations={workstations}
                assignments={assignments}
                workers={workers}
                selectedShift={selectedShift}
                onWorkerSelect={handleWorkerSelect}
                onAssignmentChange={fetchAssignments}
              />
            </div>

            {/* Worker Stats Panel - Right Side (1/3) */}
            <div className="lg:col-span-1">
              <WorkerStatsPanel
                selectedWorker={selectedWorker}
                workers={workers}
                onWorkerSelect={handleWorkerSelect}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftManagement onShiftChange={() => fetchAssignments()} />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6 text-white">
            <h3 className="text-xl font-bold mb-4">Performance Overview</h3>
            <p className="text-blue-200">Detailed statistics coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
