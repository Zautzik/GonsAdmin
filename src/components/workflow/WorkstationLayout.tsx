import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Printer, Scissors, Wrench, Layers, Hand, GripVertical, Truck, Crown, UserCheck } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useLanguage } from "@/contexts/LanguageContext";

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
  die_cutter: { icon: Layers, label: "Die Cutters", labelEs: "Troqueladores", color: "from-pink-500/30 to-rose-600/30", border: "border-pink-500/60", roles: ["technician"] },
  guillotine: { icon: Scissors, label: "Guillotine", labelEs: "Guillotina", color: "from-orange-500/30 to-amber-600/30", border: "border-orange-500/60", roles: ["technician"] },
  offset_printer: { icon: Printer, label: "Offset Printers", labelEs: "Impresoras Offset", color: "from-purple-500/30 to-violet-600/30", border: "border-purple-500/60", roles: ["master", "assistant"] },
  dispatch: { icon: Truck, label: "Dispatch", labelEs: "Despacho", color: "from-blue-500/30 to-cyan-600/30", border: "border-blue-500/60", roles: ["driver", "assistant"] },
  workshop: { icon: Wrench, label: "Workshop", labelEs: "Taller", color: "from-green-500/30 to-emerald-600/30", border: "border-green-500/60", roles: ["operator"] },
};

function DraggableWorker({ worker, assignmentId }: { worker: any; assignmentId?: string }) {
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

  const roleBadge = getRoleBadge(worker.worker_role);
  const RoleIcon = roleBadge.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-2 border-primary/60 rounded-lg p-2.5 hover:from-blue-500/50 hover:to-purple-500/50 hover:border-primary hover:scale-105 transition-all cursor-grab active:cursor-grabbing shadow-lg hover:shadow-primary/30"
    >
      {!assignmentId && (
        <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
          <Hand className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-primary/80" />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-primary/40">
          {worker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{worker.name}</p>
          <div className="flex items-center gap-1">
            <Badge className={`${roleBadge.color} text-[10px] px-1 py-0`}>
              <RoleIcon className="w-2.5 h-2.5 mr-0.5" />
              {roleBadge.label}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-accent">{worker.overall_rating}</div>
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
          <div>
            <h4 className="font-bold text-white text-sm">{station.name}</h4>
          </div>
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

      <div className={`space-y-2 min-h-[100px] rounded-lg border-2 border-dashed p-2 transition-all duration-300 ${isOver ? 'border-primary bg-primary/10' : 'border-white/30 bg-white/5'}`}>
        {assignedWorkers.length > 0 ? (
          assignedWorkers.map((assignment: any) => (
            <DraggableWorker key={assignment.id} worker={assignment.worker} assignmentId={assignment.id} />
          ))
        ) : (
          <div className={`text-center py-6 transition-all ${isOver ? 'text-primary' : 'text-white/50'}`}>
            <Users className={`w-8 h-8 mx-auto mb-1 ${isOver ? 'opacity-100 scale-110' : 'opacity-50'}`} />
            <p className={`text-xs font-medium ${isOver ? 'text-primary' : ''}`}>
              {isOver ? 'Release to assign!' : 'Drop workers here'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function WorkerPoolBySpecialty({ workers, specialty, config }: { workers: any[]; specialty: string; config: any }) {
  const { language } = useLanguage();
  const Icon = config.icon;
  
  // Group workers by role
  const workersByRole = workers.reduce((acc: any, worker: any) => {
    const role = worker.worker_role || 'operator';
    if (!acc[role]) acc[role] = [];
    acc[role].push(worker);
    return acc;
  }, {});

  if (workers.length === 0) return null;

  return (
    <div className={`bg-gradient-to-br ${config.color} ${config.border} border-2 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-white/20 rounded-full p-2">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h4 className="font-bold text-white">{language === 'es' ? config.labelEs : config.label}</h4>
        <Badge className="bg-white/20 text-white border-white/40 ml-auto">{workers.length}</Badge>
      </div>
      
      {Object.entries(workersByRole).map(([role, roleWorkers]: [string, any]) => (
        <div key={role} className="mb-3 last:mb-0">
          <p className="text-xs text-white/70 uppercase font-semibold mb-2">{role}s ({roleWorkers.length})</p>
          <div className="grid grid-cols-1 gap-2">
            {roleWorkers.map((worker: any) => (
              <DraggableWorker key={worker.id} worker={worker} />
            ))}
          </div>
        </div>
      ))}
    </div>
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

  const getAssignedWorkers = (workstationId: string) => {
    return assignments.filter((a) => a.workstation_id === workstationId);
  };

  const unassignedWorkers = workers.filter(
    (worker) => !assignments.some((a) => a.worker_id === worker.id)
  );

  // Group workstations by type
  const groupedWorkstations = workstations.reduce((acc: any, station: any) => {
    if (!acc[station.type]) acc[station.type] = [];
    acc[station.type].push(station);
    return acc;
  }, {});

  // Group unassigned workers by specialty
  const workersBySpecialty = unassignedWorkers.reduce((acc: any, worker: any) => {
    const specialties = worker.specialty || ['workshop'];
    const primarySpecialty = specialties[0] || 'workshop';
    if (!acc[primarySpecialty]) acc[primarySpecialty] = [];
    acc[primarySpecialty].push(worker);
    return acc;
  }, {});

  // Order of station types to display
  const stationOrder = ['die_cutter', 'guillotine', 'offset_printer', 'dispatch', 'workshop'];

  return (
    <div className="space-y-6">
      {/* Quick Guide */}
      <Alert className="bg-card/80 border-2 border-border backdrop-blur-sm shadow-lg">
        <Hand className="h-5 w-5 text-primary" />
        <AlertDescription className="text-foreground">
          <strong className="text-primary text-lg">🎯 {language === 'es' ? 'Guía Rápida' : 'Quick Guide'}:</strong>
          <span className="ml-2 text-sm">
            {language === 'es' 
              ? 'Arrastra trabajadores desde el panel derecho hacia las estaciones de trabajo'
              : 'Drag workers from the right panel to workstations on the left'}
          </span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Workstations */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-foreground">🏭 {language === 'es' ? 'Estaciones de Trabajo' : 'Workstations'}</h2>
            <Badge variant="outline" className="bg-supervisor/20 text-supervisor border-supervisor/40">Live View</Badge>
          </div>

          {stationOrder.map((type) => {
            const stations = groupedWorkstations[type];
            if (!stations || stations.length === 0) return null;
            
            const config = STATION_CONFIG[type as keyof typeof STATION_CONFIG] || STATION_CONFIG.workshop;
            const Icon = config.icon;

            return (
              <Card key={type} className="bg-card/50 border-border backdrop-blur-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`bg-gradient-to-br ${config.color} rounded-lg p-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{language === 'es' ? config.labelEs : config.label}</h3>
                  <Badge className="bg-primary/20 text-primary border-primary/40">
                    {stations.length} {stations.length === 1 ? 'Station' : 'Stations'}
                  </Badge>
                </div>
                
                <div className={`grid gap-4 ${type === 'workshop' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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
                        selectedOT={selectedOT}
                      />
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {/* RIGHT: Available Workers by Specialty */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/20 rounded-full p-2 border-2 border-primary">
              <Hand className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">👥 {language === 'es' ? 'Trabajadores Disponibles' : 'Available Workers'}</h3>
              <p className="text-xs text-muted-foreground">{language === 'es' ? 'Arrastra a estaciones' : 'Drag to workstations'}</p>
            </div>
          </div>

          <Badge className="bg-primary/20 text-primary border-primary w-full justify-center text-sm py-1">
            {unassignedWorkers.length} {language === 'es' ? 'disponibles' : 'available'}
          </Badge>

          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {stationOrder.map((specialty) => {
              const config = STATION_CONFIG[specialty as keyof typeof STATION_CONFIG];
              const specialtyWorkers = workersBySpecialty[specialty] || [];
              return (
                <WorkerPoolBySpecialty
                  key={specialty}
                  workers={specialtyWorkers}
                  specialty={specialty}
                  config={config}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}