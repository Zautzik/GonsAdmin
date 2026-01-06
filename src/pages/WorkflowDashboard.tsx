import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WeeklyWorkstationLayout } from "@/components/workflow/WeeklyWorkstationLayout";
import { WeeklyPlanner } from "@/components/workflow/WeeklyPlanner";
import { WorkerSkillsEditor } from "@/components/workflow/WorkerSkillsEditor";
import { ShiftManagement } from "@/components/workflow/ShiftManagement";
import { OTManagement } from "@/components/workflow/OTManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { 
  Users, 
  Factory, 
  Clock, 
  CalendarDays, 
  ClipboardList, 
  ArrowLeft,
  Settings,
  LayoutGrid,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WorkflowDashboard() {
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedOT, setSelectedOT] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  useEffect(() => {
    fetchShifts();
    fetchWorkers();
    fetchWorkstations();
    fetchAssignments();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("start_time");

    if (error) {
      toast({ title: "Error fetching shifts", variant: "destructive" });
      return;
    }

    setShifts(data || []);
    if (!selectedShiftId && data && data.length > 0) {
      setSelectedShiftId(data[0].id);
    }
  };

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
      .select(`*, worker:workers(*), workstation:workstations(*), shift:shifts(*)`)
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

    if (!selectedShiftId) {
      toast({
        title: language === 'es' ? "Selecciona un turno primero" : "Select a shift first",
        description: language === 'es' 
          ? "Elige un turno antes de asignar trabajadores."
          : "Choose a shift before assigning workers.",
        variant: "destructive"
      });
      return;
    }

    const currentAssignments = assignments.filter(a => a.workstation_id === workstation.id);
    if (currentAssignments.length >= workstation.max_workers) {
      toast({
        title: language === 'es' ? "Estación llena" : "Workstation at capacity",
        description: language === 'es' 
          ? `${workstation.name} ya está al máximo`
          : `${workstation.name} is already at maximum capacity`,
        variant: "destructive"
      });
      return;
    }

    try {
      if (assignmentId) {
        const { error } = await supabase
          .from("worker_assignments")
          .update({ workstation_id: workstation.id, ot_id: selectedOT?.id || null })
          .eq("id", assignmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("worker_assignments")
          .insert({
            worker_id: worker.id,
            workstation_id: workstation.id,
            shift_id: selectedShiftId,
            date: new Date().toISOString().split("T")[0],
            role: "operator",
            ot_id: selectedOT?.id || null
          });
        if (error) throw error;
      }

      toast({
        title: language === 'es' ? "Trabajador asignado" : "Worker assigned",
        description: language === 'es' 
          ? `${worker.name} asignado a ${workstation.name}`
          : `${worker.name} assigned to ${workstation.name}`
      });

      fetchAssignments();
    } catch (error: any) {
      toast({
        title: language === 'es' ? "Error al asignar" : "Error assigning worker",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Stats
  const assignedToday = assignments.length;
  const availableWorkers = workers.filter(w => !assignments.some(a => a.worker_id === w.id)).length;
  const multiSkillWorkers = workers.filter(w => (w.specialty?.length || 0) > 1).length;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBackToDashboard}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Volver' : 'Back'}
                </Button>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Factory className="w-5 h-5 text-primary" />
                    {language === 'es' ? 'Gestión de Taller' : 'Workshop Manager'}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    <Users className="w-3 h-3 mr-1" />
                    {assignedToday} {language === 'es' ? 'asignados' : 'assigned'}
                  </Badge>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    {availableWorkers} {language === 'es' ? 'disponibles' : 'available'}
                  </Badge>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {multiSkillWorkers} multi-skill
                  </Badge>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Selected OT Banner */}
        {selectedOT && (
          <div className="bg-primary/10 border-b border-primary/30">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary text-primary-foreground">
                    {language === 'es' ? 'OT Activa' : 'Active OT'}
                  </Badge>
                  <span className="font-bold text-foreground">{selectedOT.ot_number}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground">{selectedOT.client_name}</span>
                  <Badge variant="outline">{selectedOT.quantity} {language === 'es' ? 'unidades' : 'units'}</Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedOT(null)}
                >
                  {language === 'es' ? 'Limpiar selección' : 'Clear selection'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 animate-fade-in">
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="bg-muted/50 border border-border mb-6 p-1">
              <TabsTrigger 
                value="weekly" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Planificador' : 'Planner'}
              </TabsTrigger>
              <TabsTrigger 
                value="layout" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Vista Semanal' : 'Weekly View'}
              </TabsTrigger>
              <TabsTrigger 
                value="workers" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Configurar' : 'Configure'}
              </TabsTrigger>
              <TabsTrigger 
                value="ots" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Órdenes' : 'Work Orders'}
              </TabsTrigger>
              <TabsTrigger 
                value="machines" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Turnos' : 'Shifts'}
              </TabsTrigger>
            </TabsList>

            {/* Weekly Planner - New default view */}
            <TabsContent value="weekly" className="mt-0">
              <WeeklyPlanner
                workstations={workstations}
                workers={workers}
                shifts={shifts}
                onAssignmentChange={() => {
                  fetchAssignments();
                  fetchWorkers();
                }}
              />
            </TabsContent>

            {/* Weekly Layout - Drag & Drop */}
            <TabsContent value="layout" className="mt-0">
              <WeeklyWorkstationLayout
                workstations={workstations}
                workers={workers}
                shifts={shifts}
                onAssignmentChange={() => {
                  fetchAssignments();
                  fetchWorkers();
                }}
              />
            </TabsContent>

            {/* Worker Configuration */}
            <TabsContent value="workers" className="mt-0">
              <WorkerSkillsEditor
                workers={workers}
                onUpdate={fetchWorkers}
              />
            </TabsContent>

            {/* Work Orders */}
            <TabsContent value="ots" className="mt-0">
              <OTManagement onOTSelect={setSelectedOT} />
            </TabsContent>

            {/* Machines */}
            <TabsContent value="machines" className="mt-0">
              <ShiftManagement onShiftChange={fetchAssignments} />
            </TabsContent>
          </Tabs>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-card rounded-lg p-3 shadow-xl border-2 border-primary">
              <div className="text-foreground font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {language === 'es' ? 'Arrastrando...' : 'Dragging...'}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
