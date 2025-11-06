import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkstationLayout } from "@/components/workflow/WorkstationLayout";
import { WorkerStatsPanel } from "@/components/workflow/WorkerStatsPanel";
import { ShiftManagement } from "@/components/workflow/ShiftManagement";
import { OTManagement } from "@/components/workflow/OTManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Users, Factory, Clock, BarChart3, ClipboardList, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";

/**
 * WorkflowDashboard - Main dashboard for managing workshop workflow
 * Inspired by FIFA squad management interface
 * Features: workstation assignments, worker stats, shift management
 */
export default function WorkflowDashboard() {
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedOT, setSelectedOT] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("morning");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBackToDashboard = () => {
    const dashboardRoutes = {
      supervisor: '/supervisor',
      manager: '/manager',
      admin: '/admin'
    };
    navigate(dashboardRoutes[role || 'supervisor']);
  };

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

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const workerData = active.data.current;
    const workstationData = over.data.current;

    if (!workerData || !workstationData) return;

    const worker = workerData.worker;
    const assignmentId = workerData.assignmentId;
    const workstation = workstationData.workstation;

    // Check capacity
    const currentAssignments = assignments.filter(a => a.workstation_id === workstation.id);
    if (currentAssignments.length >= workstation.max_workers) {
      toast({
        title: "Workstation at capacity",
        description: `${workstation.name} is already at maximum capacity`,
        variant: "destructive"
      });
      return;
    }

    try {
      // If worker is already assigned, update the assignment
      if (assignmentId) {
        const { error } = await supabase
          .from("worker_assignments")
          .update({ 
            workstation_id: workstation.id,
            ot_id: selectedOT?.id || null
          })
          .eq("id", assignmentId);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from("worker_assignments")
          .insert({
            worker_id: worker.id,
            workstation_id: workstation.id,
            shift_id: selectedShift,
            date: new Date().toISOString().split("T")[0],
            role: "operator",
            ot_id: selectedOT?.id || null
          });

        if (error) throw error;
      }

      toast({
        title: "Worker assigned successfully",
        description: `${worker.name} assigned to ${workstation.name}`
      });

      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error assigning worker",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('workflow.title')}</h1>
            <p className="text-blue-200">Dynamic Workflow & Performance Tracking</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher />
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

      {/* Selected OT Banner */}
      {selectedOT && (
        <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/40 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Active OT: {selectedOT.ot_number}</h3>
              <p className="text-sm text-blue-200">{selectedOT.client_name} - {selectedOT.quantity} units</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedOT(null)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="ots" className="w-full">
        <TabsList className="bg-white/10 border-white/20 backdrop-blur-sm">
          <TabsTrigger value="ots" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <ClipboardList className="w-4 h-4 mr-2" />
            {t('workflow.workOrders')}
          </TabsTrigger>
          <TabsTrigger value="layout" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Factory className="w-4 h-4 mr-2" />
            {t('workflow.layout')}
          </TabsTrigger>
          <TabsTrigger value="shifts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" />
            {t('workflow.shifts')}
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('workflow.statistics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ots" className="mt-4">
          <OTManagement onOTSelect={setSelectedOT} />
        </TabsContent>

        <TabsContent value="layout" className="mt-4">
          {/* Shift Selection */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                <h3 className="text-lg font-bold text-white">Select Shift</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedShift("morning")}
                  variant={selectedShift === "morning" ? "default" : "outline"}
                  className={selectedShift === "morning" 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
                >
                  Morning Shift
                </Button>
                <Button
                  onClick={() => setSelectedShift("evening")}
                  variant={selectedShift === "evening" ? "default" : "outline"}
                  className={selectedShift === "evening" 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
                >
                  Evening Shift
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Workstation Layout - Left Side (3/4) */}
            <div className="lg:col-span-3">
              <WorkstationLayout
                workstations={workstations}
                assignments={assignments}
                workers={workers}
                selectedShift={selectedShift}
                selectedOT={selectedOT}
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

      <DragOverlay>
        {activeId ? (
          <div className="bg-white/20 rounded p-2 backdrop-blur-sm">
            <div className="text-white font-medium">Dragging...</div>
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
