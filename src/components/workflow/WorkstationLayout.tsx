import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Printer, Scissors, Wrench, Layers, Hand, GripVertical, Truck, Crown, UserCheck, Star, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useLanguage } from "@/contexts/LanguageContext";
import { WorkerStatsPanel } from "./WorkerStatsPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WorkstationLayoutProps {
  workstations: any[];
  assignments: any[];
  workers: any[];
  selectedShift: string;
  selectedOT: any;
  onWorkerSelect: (worker: any) => void;
  onAssignmentChange: () => void;
}

const STATION_CONFIG = {
  die_cutter: { icon: Layers, label: "Die Cutters", labelEs: "Troqueladores", color: "from-pink-500/30 to-rose-600/30", border: "border-pink-500/60", bgColor: "bg-pink-500/10", roles: ["technician"] },
  guillotine: { icon: Scissors, label: "Guillotine", labelEs: "Guillotina", color: "from-orange-500/30 to-amber-600/30", border: "border-orange-500/60", bgColor: "bg-orange-500/10", roles: ["technician"] },
  offset_printer: { icon: Printer, label: "Offset Printers", labelEs: "Impresoras Offset", color: "from-purple-500/30 to-violet-600/30", border: "border-purple-500/60", bgColor: "bg-purple-500/10", roles: ["master", "assistant"] },
  dispatch: { icon: Truck, label: "Dispatch", labelEs: "Despacho", color: "from-blue-500/30 to-cyan-600/30", border: "border-blue-500/60", bgColor: "bg-blue-500/10", roles: ["driver", "assistant"] },
  workshop: { icon: Wrench, label: "Workshop", labelEs: "Taller", color: "from-green-500/30 to-emerald-600/30", border: "border-green-500/60", bgColor: "bg-green-500/10", roles: ["operator"] },
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
      case "master": return { icon: Crown, color: "bg-yellow-500/80 text-yellow-100", label: "Master" };
      case "driver": return { icon: Truck, color: "bg-blue-500/80 text-blue-100", label: "Driver" };
      case "assistant": return { icon: UserCheck, color: "bg-green-500/80 text-green-100", label: "Asst" };
      case "technician": return { icon: Wrench, color: "bg-purple-500/80 text-purple-100", label: "Tech" };
      default: return { icon: Users, color: "bg-gray-500/80 text-gray-100", label: "Op" };
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 90) return "text-yellow-400";
    if (rating >= 80) return "text-purple-400";
    if (rating >= 70) return "text-blue-400";
    return "text-green-400";
  };

  const hasMultipleSpecialties = (worker.specialty?.length || 0) > 1;
  const roleBadge = getRoleBadge(worker.worker_role);
  const RoleIcon = roleBadge.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-2 rounded-lg ${compact ? 'p-2' : 'p-2.5'} hover:from-blue-500/50 hover:to-purple-500/50 hover:border-primary hover:scale-105 transition-all cursor-grab active:cursor-grabbing shadow-lg hover:shadow-primary/30 ${
        hasMultipleSpecialties ? 'border-yellow-400/80 ring-1 ring-yellow-400/40' : 'border-primary/60'
      }`}
    >
      {!assignmentId && (
        <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
          <Hand className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      {hasMultipleSpecialties && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 rounded-full p-1" title="Multi-specialty worker">
          <Sparkles className="w-3 h-3 text-yellow-900" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-primary/80" />
        <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-primary/40`}>
          {worker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-white truncate`}>{worker.name}</p>
          <Badge className={`${roleBadge.color} text-[10px] px-1 py-0`}>
            <RoleIcon className="w-2.5 h-2.5 mr-0.5" />
            {roleBadge.label}
          </Badge>
        </div>
        <div className="text-right">
          <div className={`${compact ? 'text-base' : 'text-lg'} font-bold ${getRatingColor(worker.overall_rating)}`}>{worker.overall_rating}</div>
          <p className="text-[10px] text-blue-200">OVR</p>
        </div>
      </div>
    </div>
  );
}

function DroppableWorkstation({ station, assignedWorkers, occupancy, capacity, config, selectedOT }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: station.id,
    data: { workstation: station, selectedOT },
  });

  const Icon = config.icon;

  return (
    <Card
      ref={setNodeRef}
      className={`bg-gradient-to-br ${config.color} ${config.border} border-2 p-3 transition-all duration-300 ${
        isOver ? 'ring-4 ring-primary scale-105 bg-primary/20 shadow-2xl shadow-primary/40' : 'hover:scale-102 hover:shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white" />
          <h4 className="font-bold text-white text-sm">{station.name}</h4>
        </div>
        <Badge variant="outline" className={`${station.status === "active" ? "bg-green-500/30 border-green-500" : "bg-gray-500/30 border-gray-500"} text-white text-xs`}>
          {station.status}
        </Badge>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-white/80 mb-1">
          <span>Capacity</span>
          <span className="font-bold">{occupancy}/{capacity}</span>
        </div>
        <div className="h-2 bg-background/30 rounded-full overflow-hidden">
          <div className={`h-full ${occupancy >= capacity ? "bg-red-500" : "bg-green-500"} transition-all`} style={{ width: `${Math.min((occupancy / capacity) * 100, 100)}%` }} />
        </div>
      </div>

      <div className={`space-y-2 min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-all duration-300 ${isOver ? 'border-primary bg-primary/10' : 'border-white/30 bg-white/5'}`}>
        {assignedWorkers.length > 0 ? (
          assignedWorkers.map((assignment: any) => (
            <DraggableWorker key={assignment.id} worker={assignment.worker} assignmentId={assignment.id} compact />
          ))
        ) : (
          <div className={`text-center py-4 transition-all ${isOver ? 'text-primary' : 'text-white/50'}`}>
            <Users className={`w-6 h-6 mx-auto mb-1 ${isOver ? 'opacity-100 scale-110' : 'opacity-50'}`} />
            <p className={`text-xs font-medium ${isOver ? 'text-primary' : ''}`}>
              {isOver ? 'Release to assign!' : 'Drop workers here'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function MachineSection({ 
  type, 
  stations, 
  config, 
  assignments, 
  availableWorkers,
  onWorkerSelect 
}: { 
  type: string; 
  stations: any[]; 
  config: any; 
  assignments: any[];
  availableWorkers: any[];
  onWorkerSelect: (worker: any) => void;
}) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);
  const Icon = config.icon;

  const getAssignedWorkers = (workstationId: string) => {
    return assignments.filter((a) => a.workstation_id === workstationId);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`${config.bgColor} border-2 ${config.border} overflow-hidden`}>
        <CollapsibleTrigger className="w-full">
          <div className={`bg-gradient-to-r ${config.color} p-4 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all`}>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{language === 'es' ? config.labelEs : config.label}</h3>
              <Badge className="bg-cyan-500/80 text-white border-cyan-400/60">
                {stations.length} {stations.length === 1 ? 'Station' : 'Stations'}
              </Badge>
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Workstations */}
              <div className={`${type === 'workshop' ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                <div className={`grid gap-3 ${type === 'workshop' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {stations.map((station: any) => {
                    const assignedWorkers = getAssignedWorkers(station.id);
                    return (
                      <DroppableWorkstation
                        key={station.id}
                        station={station}
                        assignedWorkers={assignedWorkers}
                        occupancy={assignedWorkers.length}
                        capacity={station.max_workers}
                        config={config}
                        selectedOT={null}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Available Workers Pool for this machine type */}
              <div className="lg:col-span-1">
                <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-2 border-cyan-400/40 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-cyan-500/30 rounded-full p-1.5">
                      <Users className="w-4 h-4 text-cyan-200" />
                    </div>
                    <h4 className="font-bold text-cyan-100 text-sm">
                      {language === 'es' ? 'Trabajadores Disponibles' : 'Available Workers'}
                    </h4>
                    <Badge className="bg-cyan-500/30 text-cyan-100 border-cyan-400/50 ml-auto text-xs">
                      {availableWorkers.length}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-cyan-200/70 mb-3">
                    {language === 'es' 
                      ? 'Arrastra trabajadores a las estaciones' 
                      : 'Click and hold any card, then drag to a workstation'}
                  </p>

                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-1 gap-2 pr-2">
                      {availableWorkers.length > 0 ? (
                        availableWorkers.map((worker: any) => (
                          <div key={worker.id} onClick={() => onWorkerSelect(worker)}>
                            <DraggableWorker worker={worker} compact />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-cyan-200/50">
                          <Users className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">{language === 'es' ? 'Sin trabajadores disponibles' : 'No workers available'}</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function WorkstationLayout({
  workstations,
  assignments,
  workers,
  selectedShift,
  selectedOT,
  onWorkerSelect,
  onAssignmentChange,
}: WorkstationLayoutProps) {
  const { language } = useLanguage();
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  // Group workstations by type
  const groupedWorkstations = workstations.reduce((acc: any, station: any) => {
    if (!acc[station.type]) acc[station.type] = [];
    acc[station.type].push(station);
    return acc;
  }, {});

  // Get unassigned workers
  const unassignedWorkers = workers.filter(
    (worker) => !assignments.some((a) => a.worker_id === worker.id)
  );

  // Group unassigned workers by specialty
  const getWorkersForMachineType = (machineType: string) => {
    return unassignedWorkers.filter((worker: any) => {
      const specialties = worker.specialty || ['workshop'];
      return specialties.includes(machineType);
    });
  };

  // Order of station types to display
  const stationOrder = ['die_cutter', 'guillotine', 'offset_printer', 'dispatch', 'workshop'];

  const handleWorkerSelect = (worker: any) => {
    setSelectedWorker(worker);
    onWorkerSelect(worker);
  };

  return (
    <div className="space-y-4">
      {/* Quick Guide */}
      <Alert className="bg-card/80 border-2 border-border backdrop-blur-sm shadow-lg">
        <Hand className="h-5 w-5 text-primary" />
        <AlertDescription className="text-foreground">
          <strong className="text-primary text-lg">🎯 {language === 'es' ? 'Guía Rápida' : 'Quick Guide'}:</strong>
          <span className="ml-2 text-sm">
            {language === 'es' 
              ? 'Cada sección de máquina tiene su propio grupo de trabajadores. Arrastra trabajadores desde el panel de disponibles hacia las estaciones.'
              : 'Each machine section has its own worker pool. Drag workers from the available panel to the workstations.'}
          </span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content - Machine Sections */}
        <div className="xl:col-span-3 space-y-4">
          {stationOrder.map((type) => {
            const stations = groupedWorkstations[type];
            if (!stations || stations.length === 0) return null;
            
            const config = STATION_CONFIG[type as keyof typeof STATION_CONFIG] || STATION_CONFIG.workshop;
            const availableWorkersForType = getWorkersForMachineType(type);

            return (
              <MachineSection
                key={type}
                type={type}
                stations={stations}
                config={config}
                assignments={assignments}
                availableWorkers={availableWorkersForType}
                onWorkerSelect={handleWorkerSelect}
              />
            );
          })}
        </div>

        {/* Right Sidebar - Worker Stats */}
        <div className="xl:col-span-1">
          <div className="sticky top-4">
            <WorkerStatsPanel
              selectedWorker={selectedWorker}
              workers={workers}
              onWorkerSelect={handleWorkerSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
