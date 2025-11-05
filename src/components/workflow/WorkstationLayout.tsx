import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, Printer, Scissors, Wrench, Layers, Info, GripVertical, Hand } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkstationLayoutProps {
  workstations: any[];
  assignments: any[];
  workers: any[];
  selectedShift: string;
  selectedOT: any;
  onWorkerSelect: (worker: any) => void;
  onAssignmentChange: () => void;
}

function DraggableWorker({ worker, assignmentId }: { worker: any; assignmentId?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignmentId || `worker-${worker.id}`,
    data: { worker, assignmentId },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-2 border-blue-400 rounded-lg p-3 hover:from-blue-500/50 hover:to-purple-500/50 hover:border-yellow-400 hover:scale-105 transition-all cursor-grab active:cursor-grabbing shadow-xl hover:shadow-yellow-500/50 animate-pulse"
    >
      {!assignmentId && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 animate-bounce">
          <Hand className="w-4 h-4 text-gray-900" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-yellow-300 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-yellow-400">
            {worker.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{worker.name}</p>
            <p className="text-xs text-blue-200">{worker.department}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-yellow-400">{worker.overall_rating}</div>
          <p className="text-xs text-blue-200">OVR</p>
        </div>
      </div>
    </div>
  );
}

function DroppableWorkstation({ 
  station, 
  assignedWorkers, 
  occupancy, 
  capacity,
  getWorkstationIcon,
  getWorkstationColor,
  onWorkerSelect,
  selectedOT
}: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: station.id,
    data: { workstation: station, selectedOT },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`${getWorkstationColor(station.type)} border-3 p-4 transition-all duration-300 ${
        isOver ? 'ring-4 ring-yellow-400 scale-105 bg-yellow-500/20 border-yellow-400 shadow-2xl shadow-yellow-500/50' : 'hover:scale-102 hover:shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getWorkstationIcon(station.type)}
          <div>
            <h3 className="font-bold text-white text-lg">{station.name}</h3>
            <p className="text-xs text-blue-200 capitalize">
              {station.type.replace("_", " ")}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`${
            station.status === "active"
              ? "bg-green-500/30 border-green-500"
              : "bg-gray-500/30 border-gray-500"
          } text-white`}
        >
          {station.status}
        </Badge>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-white mb-1">
          <span>Capacity</span>
          <span className="font-bold">{occupancy}/{capacity}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              occupancy >= capacity ? "bg-red-500" : "bg-green-500"
            } transition-all`}
            style={{ width: `${(occupancy / capacity) * 100}%` }}
          />
        </div>
      </div>

      <div className={`space-y-2 mb-3 min-h-[140px] rounded-lg border-3 border-dashed p-3 transition-all duration-300 ${
        isOver ? 'border-yellow-400 bg-yellow-500/20 animate-pulse' : 'border-white/30 bg-white/5'
      }`}>
        {assignedWorkers.length > 0 ? (
          assignedWorkers.map((assignment: any) => (
            <DraggableWorker 
              key={assignment.id} 
              worker={assignment.worker} 
              assignmentId={assignment.id}
            />
          ))
        ) : (
          <div className={`text-center py-8 transition-all ${isOver ? 'text-yellow-300' : 'text-blue-200'}`}>
            <Users className={`w-12 h-12 mx-auto mb-2 ${isOver ? 'opacity-100 animate-bounce scale-125' : 'opacity-50'}`} />
            <p className={`text-sm font-bold ${isOver ? 'text-yellow-300' : ''}`}>
              {isOver ? '📌 Release to assign!' : 'Drop workers here'}
            </p>
          </div>
        )}
      </div>

      {selectedOT && (
        <Badge className="bg-purple-500/30 text-purple-200 w-full justify-center mb-2">
          {selectedOT.ot_number}
        </Badge>
      )}
    </Card>
  );
}

/**
 * WorkstationLayout - Visual layout of all workstations
 * Similar to FIFA formation view
 */
export function WorkstationLayout({
  workstations,
  assignments,
  workers,
  selectedShift,
  selectedOT,
  onWorkerSelect,
  onAssignmentChange,
}: WorkstationLayoutProps) {
  const { toast } = useToast();
  
  const getWorkstationIcon = (type: string) => {
    switch (type) {
      case "offset_printer": return <Printer className="w-6 h-6" />;
      case "guillotine": return <Scissors className="w-6 h-6" />;
      case "die_cutter": return <Layers className="w-6 h-6" />;
      case "workshop": return <Wrench className="w-6 h-6" />;
      default: return <Wrench className="w-6 h-6" />;
    }
  };

  const getWorkstationColor = (type: string) => {
    switch (type) {
      case "offset_printer": return "bg-purple-500/20 border-purple-500/40";
      case "guillotine": return "bg-orange-500/20 border-orange-500/40";
      case "die_cutter": return "bg-pink-500/20 border-pink-500/40";
      case "workshop": return "bg-green-500/20 border-green-500/40";
      default: return "bg-blue-500/20 border-blue-500/40";
    }
  };

  const getAssignedWorkers = (workstationId: string) => {
    return assignments.filter((a) => a.workstation_id === workstationId);
  };

  const unassignedWorkers = workers.filter(
    (worker) => !assignments.some((a) => a.worker_id === worker.id)
  );

  // Group workstations by type
  const groupedWorkstations = workstations.reduce((acc: any, station: any) => {
    if (!acc[station.type]) {
      acc[station.type] = [];
    }
    acc[station.type].push(station);
    return acc;
  }, {});

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      offset_printer: "Offset Printers",
      guillotine: "Guillotine Cutters",
      die_cutter: "Die Cutters",
      workshop: "Workshop Stations"
    };
    return labels[type] || type.replace("_", " ");
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Instructions */}
      <Alert className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/60 shadow-lg">
        <Hand className="h-5 w-5 text-yellow-300 animate-bounce" />
        <AlertDescription className="text-white">
          <strong className="text-yellow-300 text-lg">🎯 Quick Guide:</strong>
          <ol className="mt-2 space-y-1 text-sm">
            <li>1️⃣ <strong>Grab</strong> a worker card from the "Available Workers" section below (look for the pulsing cards with hand icons)</li>
            <li>2️⃣ <strong>Drag</strong> the worker over any workstation (the box will glow yellow when ready)</li>
            <li>3️⃣ <strong>Drop</strong> to assign! You can also move assigned workers between workstations</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Unassigned Workers Pool - MOVED TO TOP */}
      {unassignedWorkers.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 border-3 border-yellow-400/60 backdrop-blur-sm p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-400 rounded-full p-2 animate-pulse">
              <Hand className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-yellow-300">👥 Available Workers - Drag These!</h3>
              <p className="text-sm text-blue-200">Click and hold any card, then drag to a workstation below</p>
            </div>
            <Badge className="bg-yellow-500/30 text-yellow-200 border-yellow-400 ml-auto text-lg px-3 py-1">
              {unassignedWorkers.length} Ready
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unassignedWorkers.map((worker) => (
              <DraggableWorker key={worker.id} worker={worker} />
            ))}
          </div>
        </Card>
      )}

      {/* Workshop Floor - Grouped by Machine Type */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-white">🏭 Workshop Floor</h2>
          <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/40 text-sm">
            Live View
          </Badge>
        </div>

        {Object.entries(groupedWorkstations).map(([type, stations]: [string, any]) => (
          <Card key={type} className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              {getWorkstationIcon(type)}
              <h3 className="text-xl font-bold text-white">{getTypeLabel(type)}</h3>
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/40">
                {(stations as any[]).length} {(stations as any[]).length === 1 ? 'Station' : 'Stations'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {(stations as any[]).map((station) => {
                const assignedWorkers = getAssignedWorkers(station.id);
                const occupancy = assignedWorkers.length;
                const capacity = station.max_workers;

                return (
                  <DroppableWorkstation
                    key={station.id}
                    station={station}
                    assignedWorkers={assignedWorkers}
                    occupancy={occupancy}
                    capacity={capacity}
                    getWorkstationIcon={getWorkstationIcon}
                    getWorkstationColor={getWorkstationColor}
                    onWorkerSelect={onWorkerSelect}
                    selectedOT={selectedOT}
                  />
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
