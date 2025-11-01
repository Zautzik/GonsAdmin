import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Printer, Scissors, Wrench } from "lucide-react";

interface WorkstationLayoutProps {
  workstations: any[];
  assignments: any[];
  workers: any[];
  selectedShift: string;
  onWorkerSelect: (worker: any) => void;
  onAssignmentChange: () => void;
}

/**
 * WorkstationLayout - Visual layout of all workstations
 * Similar to FIFA formation view
 */
export function WorkstationLayout({
  workstations,
  assignments,
  workers,
  onWorkerSelect,
}: WorkstationLayoutProps) {
  
  const getWorkstationIcon = (type: string) => {
    switch (type) {
      case "offset_printer": return <Printer className="w-6 h-6" />;
      case "guillotine": return <Scissors className="w-6 h-6" />;
      default: return <Wrench className="w-6 h-6" />;
    }
  };

  const getWorkstationColor = (type: string) => {
    switch (type) {
      case "offset_printer": return "bg-purple-500/20 border-purple-500/40";
      case "guillotine": return "bg-orange-500/20 border-orange-500/40";
      default: return "bg-green-500/20 border-green-500/40";
    }
  };

  const getAssignedWorkers = (workstationId: string) => {
    return assignments
      .filter((a) => a.workstation_id === workstationId)
      .map((a) => a.worker);
  };

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Workshop Floor</h2>
        <Badge variant="outline" className="bg-blue-500/20 text-white border-blue-500/40">
          Live View
        </Badge>
      </div>

      {/* Workstations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workstations.map((station) => {
          const assignedWorkers = getAssignedWorkers(station.id);
          const occupancy = assignedWorkers.length;
          const capacity = station.max_workers;

          return (
            <Card
              key={station.id}
              className={`${getWorkstationColor(station.type)} border-2 p-4 hover:scale-105 transition-transform cursor-pointer`}
            >
              {/* Station Header */}
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

              {/* Occupancy Bar */}
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

              {/* Assigned Workers */}
              <div className="space-y-2 mb-3">
                {assignedWorkers.length > 0 ? (
                  assignedWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      onClick={() => onWorkerSelect(worker)}
                      className="bg-white/10 rounded p-2 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{worker.name}</p>
                            <p className="text-xs text-blue-200">{worker.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-yellow-400">
                            {worker.overall_rating}
                          </div>
                          <p className="text-xs text-blue-200">OVR</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-blue-200">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No workers assigned</p>
                  </div>
                )}
              </div>

              {/* Add Worker Button */}
              {occupancy < capacity && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Assign Worker
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
