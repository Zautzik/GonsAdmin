import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, Printer, Scissors, Wrench, Layers, Info, GripVertical } from "lucide-react";
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
      className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-2 border-blue-400/50 rounded-lg p-3 hover:from-blue-500/40 hover:to-purple-500/40 hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing shadow-lg hover:shadow-blue-500/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-blue-300 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
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
      className={`${getWorkstationColor(station.type)} border-2 p-4 transition-all ${
        isOver ? 'ring-4 ring-blue-400 scale-105 bg-blue-500/30 border-blue-400' : 'hover:scale-102'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getWorkstationIcon(station.type)}
          <div>
            <h3 className="font-bold text-white">{station.name}</h3>
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
          <span>{occupancy}/{capacity}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              occupancy >= capacity ? "bg-red-500" : "bg-green-500"
            } transition-all`}
            style={{ width: `${(occupancy / capacity) * 100}%` }}
          />
        </div>
      </div>

      <div className={`space-y-2 mb-3 min-h-[120px] rounded-lg border-2 border-dashed p-3 transition-all ${
        isOver ? 'border-blue-400 bg-blue-500/20' : 'border-white/20 bg-white/5'
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
          <div className={`text-center py-6 transition-all ${isOver ? 'text-blue-300' : 'text-blue-200'}`}>
            <Users className={`w-10 h-10 mx-auto mb-2 ${isOver ? 'opacity-100 animate-bounce' : 'opacity-50'}`} />
            <p className="text-sm font-medium">Drop workers here</p>
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

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Alert className="bg-blue-500/20 border-blue-500/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-white">
          <strong>How to use:</strong> Drag workers from the "Available Workers" pool below and drop them onto workstations to assign them. 
          Workers already assigned can be dragged between workstations. Each workstation has a maximum capacity shown in the progress bar.
        </AlertDescription>
      </Alert>

      <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Workshop Floor</h2>
          <Badge variant="outline" className="bg-blue-500/20 text-white border-blue-500/40">
            Live View
          </Badge>
        </div>

      {/* Workstations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {workstations.map((station) => {
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

        {/* Unassigned Workers Pool */}
        {unassignedWorkers.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/40 backdrop-blur-sm p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-300" />
              <h3 className="text-lg font-bold text-white">Available Workers - Drag to Assign</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {unassignedWorkers.map((worker) => (
                <DraggableWorker key={worker.id} worker={worker} />
              ))}
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}
