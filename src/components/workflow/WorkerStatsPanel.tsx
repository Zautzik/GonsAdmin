import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, TrendingUp, Clock, Users, Zap, Award, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WorkerStatsPanelProps {
  selectedWorker: any;
  workers: any[];
  onWorkerSelect: (worker: any) => void;
}

export function WorkerStatsPanel({
  selectedWorker,
  workers,
  onWorkerSelect,
}: WorkerStatsPanelProps) {
  const { language } = useLanguage();
  
  const getStatColor = (value: number) => {
    if (value >= 80) return "text-green-400";
    if (value >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 rounded-full p-2 border-2 border-primary">
          <User className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          {language === 'es' ? 'Estadísticas' : 'Worker Stats'}
        </h3>
      </div>

      {/* Selected Worker Detail */}
      {selectedWorker ? (
        <Card className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-2 border-blue-400/40 backdrop-blur-sm p-4">
          {/* Worker Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {selectedWorker.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{selectedWorker.name}</h3>
              <p className="text-sm text-blue-200">{selectedWorker.department}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">
                {selectedWorker.overall_rating}
              </div>
              <p className="text-[10px] text-blue-200">OVR</p>
            </div>
          </div>

          {/* Performance Stats - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/10 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <Zap className="w-3 h-3 text-white/70" />
                <span className={`text-sm font-bold ${getStatColor(selectedWorker.sheets_per_hour || 0)}`}>
                  {selectedWorker.sheets_per_hour || 0}
                </span>
              </div>
              <p className="text-[10px] text-white/60">{language === 'es' ? 'Hojas/Hora' : 'Sheets/Hr'}</p>
            </div>

            <div className="bg-white/10 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <Users className="w-3 h-3 text-white/70" />
                <span className={`text-sm font-bold ${getStatColor(selectedWorker.teamwork_rating || 0)}`}>
                  {selectedWorker.teamwork_rating || 0}
                </span>
              </div>
              <p className="text-[10px] text-white/60">{language === 'es' ? 'Trabajo Equipo' : 'Teamwork'}</p>
            </div>

            <div className="bg-white/10 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <Award className="w-3 h-3 text-white/70" />
                <span className={`text-sm font-bold ${getStatColor(selectedWorker.quality_score || 0)}`}>
                  {selectedWorker.quality_score || 0}
                </span>
              </div>
              <p className="text-[10px] text-white/60">{language === 'es' ? 'Calidad' : 'Quality'}</p>
            </div>

            <div className="bg-white/10 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-3 h-3 text-white/70" />
                <span className={`text-sm font-bold ${getStatColor(selectedWorker.speed_score || 0)}`}>
                  {selectedWorker.speed_score || 0}
                </span>
              </div>
              <p className="text-[10px] text-white/60">{language === 'es' ? 'Velocidad' : 'Speed'}</p>
            </div>
          </div>

          {/* Attendance bar */}
          <div className="bg-white/10 rounded p-2 mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/70" />
                <span className="text-[10px] text-white/70">{language === 'es' ? 'Asistencia' : 'Attendance'}</span>
              </div>
              <span className={`text-sm font-bold ${getStatColor(selectedWorker.attendance_score || 0)}`}>
                {selectedWorker.attendance_score || 0}%
              </span>
            </div>
            <Progress value={selectedWorker.attendance_score || 0} className="h-1.5" />
          </div>

          {/* Additional Info */}
          <div className="flex gap-2">
            <Badge 
              variant="outline" 
              className={`flex-1 justify-center text-xs ${
                selectedWorker.overtime_availability 
                  ? "bg-green-500/20 border-green-500 text-green-300" 
                  : "bg-red-500/20 border-red-500 text-red-300"
              }`}
            >
              {selectedWorker.overtime_availability 
                ? (language === 'es' ? 'Disponible OT' : 'OT Available') 
                : (language === 'es' ? 'Sin OT' : 'No OT')}
            </Badge>
            <Badge variant="outline" className="flex-1 justify-center text-xs bg-blue-500/20 border-blue-500 text-blue-300">
              {selectedWorker.lateness_minutes || 0} min
            </Badge>
          </div>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border backdrop-blur-sm p-6 text-center">
          <User className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            {language === 'es' ? 'Selecciona un trabajador para ver estadísticas' : 'Select a worker to view stats'}
          </p>
        </Card>
      )}

      {/* All Workers List - Compact */}
      <Card className="bg-card/50 border-border backdrop-blur-sm p-3">
        <h4 className="text-sm font-bold text-foreground mb-2">
          {language === 'es' ? 'Todos los Trabajadores' : 'All Workers'} ({workers.length})
        </h4>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1.5 pr-2">
            {workers.map((worker) => (
              <div
                key={worker.id}
                onClick={() => onWorkerSelect(worker)}
                className={`bg-background/50 rounded p-2 hover:bg-background/80 transition-colors cursor-pointer ${
                  selectedWorker?.id === worker.id ? "ring-2 ring-primary bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground truncate max-w-[100px]">{worker.name}</p>
                      <p className="text-[10px] text-muted-foreground">{worker.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-yellow-500">
                      {worker.overall_rating || 75}
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < Math.floor((worker.overall_rating || 75) / 20)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
