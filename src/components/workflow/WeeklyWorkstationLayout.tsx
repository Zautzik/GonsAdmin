import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, Printer, Scissors, Wrench, Layers, Hand, GripVertical, Truck, Crown, 
  UserCheck, Star, Sparkles, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Sun, Moon, RotateCcw, Calendar, Copy
} from "lucide-react";
import { useDroppable, useDraggable, DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { useLanguage } from "@/contexts/LanguageContext";
import { WorkerStatsPanel } from "./WorkerStatsPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface WeeklyWorkstationLayoutProps {
  workstations: any[];
  workers: any[];
  shifts: any[];
  onAssignmentChange: () => void;
}

const STATION_CONFIG = {
  die_cutter: { icon: Layers, label: "Die Cutters", labelEs: "Troqueladores", color: "from-pink-500/30 to-rose-600/30", border: "border-pink-500/60", bgColor: "bg-pink-500/10", roles: ["technician"] },
  guillotine: { icon: Scissors, label: "Guillotine", labelEs: "Guillotina", color: "from-orange-500/30 to-amber-600/30", border: "border-orange-500/60", bgColor: "bg-orange-500/10", roles: ["technician"] },
  offset_printer: { icon: Printer, label: "Offset Printers", labelEs: "Impresoras Offset", color: "from-purple-500/30 to-violet-600/30", border: "border-purple-500/60", bgColor: "bg-purple-500/10", roles: ["master", "assistant"] },
  dispatch: { icon: Truck, label: "Dispatch", labelEs: "Despacho", color: "from-blue-500/30 to-cyan-600/30", border: "border-blue-500/60", bgColor: "bg-blue-500/10", roles: ["driver", "assistant"] },
  workshop: { icon: Wrench, label: "Workshop", labelEs: "Taller", color: "from-green-500/30 to-emerald-600/30", border: "border-green-500/60", bgColor: "bg-green-500/10", roles: ["operator"] },
};

const DAY_NAMES = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
};

function DraggableWorker({ worker, assignmentId, compact = false }: { worker: any; assignmentId?: string; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignmentId || `worker-${worker.id}`,
    data: { worker, assignmentId },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "master": return { icon: Crown, color: "bg-yellow-500/80 text-yellow-100", label: "M" };
      case "driver": return { icon: Truck, color: "bg-blue-500/80 text-blue-100", label: "D" };
      case "assistant": return { icon: UserCheck, color: "bg-green-500/80 text-green-100", label: "A" };
      case "technician": return { icon: Wrench, color: "bg-purple-500/80 text-purple-100", label: "T" };
      default: return { icon: Users, color: "bg-gray-500/80 text-gray-100", label: "O" };
    }
  };

  const hasMultipleSpecialties = (worker.specialty?.length || 0) > 1;
  const roleBadge = getRoleBadge(worker.worker_role);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative bg-gradient-to-r from-blue-500/40 to-purple-500/40 border rounded-md ${compact ? 'p-1.5' : 'p-2'} hover:from-blue-500/50 hover:to-purple-500/50 hover:border-primary hover:scale-102 transition-all cursor-grab active:cursor-grabbing shadow-md ${
        hasMultipleSpecialties ? 'border-yellow-400/80' : 'border-primary/60'
      }`}
    >
      {hasMultipleSpecialties && (
        <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-yellow-400" />
      )}
      <div className="flex items-center gap-1.5">
        <div className={`${compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold`}>
          {worker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-white truncate`}>{worker.name}</p>
        </div>
        <Badge className={`${roleBadge.color} text-[8px] px-1 py-0 h-4`}>
          {roleBadge.label}
        </Badge>
      </div>
    </div>
  );
}

function DroppableWorkstation({ station, assignedWorkers, config, compact = false }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: station.id,
    data: { workstation: station },
  });

  const Icon = config.icon;
  const occupancy = assignedWorkers.length;
  const capacity = station.max_workers;

  return (
    <Card
      ref={setNodeRef}
      className={`bg-gradient-to-br ${config.color} ${config.border} border p-2 transition-all duration-200 ${
        isOver ? 'ring-2 ring-primary scale-102 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-white" />
          <h4 className="font-semibold text-white text-xs truncate">{station.name}</h4>
        </div>
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-background/20 text-white border-white/30">
          {occupancy}/{capacity}
        </Badge>
      </div>

      <div className={`space-y-1 min-h-[50px] rounded border border-dashed p-1.5 transition-all ${isOver ? 'border-primary bg-primary/10' : 'border-white/30 bg-white/5'}`}>
        {assignedWorkers.length > 0 ? (
          assignedWorkers.slice(0, 3).map((assignment: any) => (
            <DraggableWorker key={assignment.id} worker={assignment.worker} assignmentId={assignment.id} compact />
          ))
        ) : (
          <div className="text-center py-2 text-white/40">
            <Users className="w-4 h-4 mx-auto opacity-50" />
            <p className="text-[9px]">Drop here</p>
          </div>
        )}
        {assignedWorkers.length > 3 && (
          <p className="text-[9px] text-white/60 text-center">+{assignedWorkers.length - 3} more</p>
        )}
      </div>
    </Card>
  );
}

export function WeeklyWorkstationLayout({
  workstations,
  workers,
  shifts,
  onAssignmentChange,
}: WeeklyWorkstationLayoutProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  const morningShift = shifts.find(s => s.name.toLowerCase().includes('morning') || s.name.toLowerCase().includes('mañana'));
  const afternoonShift = shifts.find(s => s.name.toLowerCase().includes('afternoon') || s.name.toLowerCase().includes('tarde'));

  const currentShiftId = selectedShift === 'morning' ? morningShift?.id : afternoonShift?.id;

  // Get days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchAssignments();
  }, [selectedDay, currentShiftId]);

  const fetchAssignments = async () => {
    if (!currentShiftId) return;
    
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from("worker_assignments")
      .select(`*, worker:workers(*), workstation:workstations(*), shift:shifts(*)`)
      .eq("date", dateStr)
      .eq("shift_id", currentShiftId);

    if (!error) {
      setAssignments(data || []);
    }
  };

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const handleToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };

  const handleClearShift = async () => {
    if (!currentShiftId) return;
    
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const { error } = await supabase
      .from("worker_assignments")
      .delete()
      .eq("date", dateStr)
      .eq("shift_id", currentShiftId);

    if (error) {
      toast({ title: language === 'es' ? "Error al limpiar turno" : "Error clearing shift", variant: "destructive" });
    } else {
      toast({ title: language === 'es' ? "Turno limpiado" : "Shift cleared" });
      fetchAssignments();
      onAssignmentChange();
    }
  };

  const handleCopyFromMorning = async () => {
    if (!morningShift || !afternoonShift) return;
    
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    
    // Get morning assignments
    const { data: morningAssignments } = await supabase
      .from("worker_assignments")
      .select("*")
      .eq("date", dateStr)
      .eq("shift_id", morningShift.id);

    if (!morningAssignments || morningAssignments.length === 0) {
      toast({ title: language === 'es' ? "No hay asignaciones en la mañana" : "No morning assignments to copy", variant: "destructive" });
      return;
    }

    // Clear afternoon and insert copied
    await supabase
      .from("worker_assignments")
      .delete()
      .eq("date", dateStr)
      .eq("shift_id", afternoonShift.id);

    const newAssignments = morningAssignments.map(a => ({
      worker_id: a.worker_id,
      workstation_id: a.workstation_id,
      shift_id: afternoonShift.id,
      date: dateStr,
      role: a.role,
      ot_id: a.ot_id
    }));

    const { error } = await supabase
      .from("worker_assignments")
      .insert(newAssignments);

    if (error) {
      toast({ title: language === 'es' ? "Error al copiar" : "Error copying", variant: "destructive" });
    } else {
      toast({ title: language === 'es' ? "Copiado desde la mañana" : "Copied from morning" });
      fetchAssignments();
      onAssignmentChange();
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !currentShiftId) return;

    const workerData = active.data.current;
    const workstationData = over.data.current;

    if (!workerData || !workstationData) return;

    const worker = workerData.worker;
    const assignmentId = workerData.assignmentId;
    const workstation = workstationData.workstation;

    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const currentAssignments = assignments.filter(a => a.workstation_id === workstation.id);
    
    if (currentAssignments.length >= workstation.max_workers) {
      toast({
        title: language === 'es' ? "Estación llena" : "Workstation full",
        variant: "destructive"
      });
      return;
    }

    try {
      if (assignmentId) {
        await supabase
          .from("worker_assignments")
          .update({ workstation_id: workstation.id })
          .eq("id", assignmentId);
      } else {
        await supabase
          .from("worker_assignments")
          .insert({
            worker_id: worker.id,
            workstation_id: workstation.id,
            shift_id: currentShiftId,
            date: dateStr,
            role: "operator",
          });
      }

      toast({
        title: language === 'es' ? "Trabajador asignado" : "Worker assigned",
        description: `${worker.name} → ${workstation.name}`
      });

      fetchAssignments();
      onAssignmentChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Group workstations by type
  const groupedWorkstations = workstations.reduce((acc: any, station: any) => {
    if (!acc[station.type]) acc[station.type] = [];
    acc[station.type].push(station);
    return acc;
  }, {});

  // Get unassigned workers for current shift
  const unassignedWorkers = workers.filter(
    (worker) => !assignments.some((a) => a.worker_id === worker.id)
  );

  const getWorkersForMachineType = (machineType: string) => {
    return unassignedWorkers.filter((worker: any) => {
      const specialties = worker.specialty || ['workshop'];
      return specialties.includes(machineType);
    });
  };

  const stationOrder = ['die_cutter', 'guillotine', 'offset_printer', 'dispatch', 'workshop'];
  const locale = language === 'es' ? es : enUS;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Week Navigation */}
        <Card className="bg-card/80 border-border p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Week Nav */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                <Calendar className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Hoy' : 'Today'}
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="ml-2 font-semibold text-foreground">
                {format(weekStart, 'MMM d', { locale })} - {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale })}
              </span>
            </div>

            {/* Day Selection */}
            <div className="flex gap-1 flex-wrap">
              {weekDays.map((day, idx) => {
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const dayName = language === 'es' ? DAY_NAMES.es[idx] : DAY_NAMES.en[idx];
                
                return (
                  <Button
                    key={idx}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[60px] ${isToday && !isSelected ? 'border-primary' : ''}`}
                  >
                    <div className="text-center">
                      <div className="text-xs font-medium">{dayName}</div>
                      <div className="text-lg font-bold">{format(day, 'd')}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Shift Selection & Actions */}
        <Card className="bg-card/80 border-border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Shift Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {language === 'es' ? 'Turno:' : 'Shift:'}
              </span>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={selectedShift === 'morning' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedShift('morning')}
                  className={selectedShift === 'morning' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  <Sun className="w-4 h-4 mr-1.5" />
                  {language === 'es' ? 'Mañana' : 'Morning'}
                </Button>
                <Button
                  variant={selectedShift === 'afternoon' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedShift('afternoon')}
                  className={selectedShift === 'afternoon' ? 'bg-indigo-500 hover:bg-indigo-600' : ''}
                >
                  <Moon className="w-4 h-4 mr-1.5" />
                  {language === 'es' ? 'Tarde' : 'Afternoon'}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedShift === 'afternoon' && (
                <Button variant="outline" size="sm" onClick={handleCopyFromMorning}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  {language === 'es' ? 'Copiar de Mañana' : 'Copy from Morning'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleClearShift} className="text-destructive hover:text-destructive">
                <RotateCcw className="w-4 h-4 mr-1.5" />
                {language === 'es' ? 'Limpiar Turno' : 'Clear Shift'}
              </Button>
            </div>
          </div>
          
          {/* Info Banner */}
          <Alert className="mt-4 bg-muted/50 border-muted">
            <Hand className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>{format(selectedDay, 'EEEE, MMMM d', { locale })}</strong> - {selectedShift === 'morning' ? (language === 'es' ? 'Turno Mañana' : 'Morning Shift') : (language === 'es' ? 'Turno Tarde' : 'Afternoon Shift')}
              <span className="ml-2 text-muted-foreground">
                {language === 'es' 
                  ? '• Arrastra trabajadores hacia las estaciones. Cada turno es independiente.'
                  : '• Drag workers to stations. Each shift is independent.'}
              </span>
            </AlertDescription>
          </Alert>
        </Card>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Workstations */}
          <div className="xl:col-span-3 space-y-4">
            {stationOrder.map((type) => {
              const stations = groupedWorkstations[type];
              if (!stations || stations.length === 0) return null;
              
              const config = STATION_CONFIG[type as keyof typeof STATION_CONFIG] || STATION_CONFIG.workshop;
              const availableWorkersForType = getWorkersForMachineType(type);
              const Icon = config.icon;

              const getAssignedWorkers = (workstationId: string) => {
                return assignments.filter((a) => a.workstation_id === workstationId);
              };

              return (
                <Collapsible key={type} defaultOpen>
                  <Card className={`${config.bgColor} border ${config.border} overflow-hidden`}>
                    <CollapsibleTrigger className="w-full">
                      <div className={`bg-gradient-to-r ${config.color} p-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-white" />
                          <h3 className="font-bold text-white">{language === 'es' ? config.labelEs : config.label}</h3>
                          <Badge className="bg-white/20 text-white text-xs">
                            {stations.length} {stations.length === 1 ? 'station' : 'stations'}
                          </Badge>
                        </div>
                        <ChevronDown className="w-4 h-4 text-white" />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Workstations */}
                          {stations.map((station: any) => (
                            <DroppableWorkstation
                              key={station.id}
                              station={station}
                              assignedWorkers={getAssignedWorkers(station.id)}
                              config={config}
                              compact
                            />
                          ))}
                          
                          {/* Available Workers Pool */}
                          <Card className="bg-cyan-500/10 border border-cyan-500/40 p-2">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Users className="w-3.5 h-3.5 text-cyan-300" />
                              <h4 className="font-semibold text-cyan-100 text-xs">
                                {language === 'es' ? 'Disponibles' : 'Available'}
                              </h4>
                              <Badge className="bg-cyan-500/30 text-cyan-100 text-[9px] ml-auto">
                                {availableWorkersForType.length}
                              </Badge>
                            </div>
                            <ScrollArea className="h-[100px]">
                              <div className="space-y-1 pr-1">
                                {availableWorkersForType.length > 0 ? (
                                  availableWorkersForType.map((worker: any) => (
                                    <div key={worker.id} onClick={() => setSelectedWorker(worker)}>
                                      <DraggableWorker worker={worker} compact />
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-cyan-200/50 text-center py-2">
                                    {language === 'es' ? 'Sin disponibles' : 'None available'}
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </Card>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {/* Sidebar - Worker Stats */}
          <div className="xl:col-span-1">
            <div className="sticky top-4">
              <WorkerStatsPanel
                selectedWorker={selectedWorker}
                workers={workers}
                onWorkerSelect={setSelectedWorker}
              />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-card rounded-lg p-2 shadow-xl border-2 border-primary">
            <div className="text-foreground text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {language === 'es' ? 'Moviendo...' : 'Moving...'}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
