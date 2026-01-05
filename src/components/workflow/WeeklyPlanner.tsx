import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sun, 
  Moon, 
  Copy, 
  Trash2, 
  Users,
  Check,
  X,
  Clock,
  Sparkles
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface WeeklyPlannerProps {
  workstations: any[];
  workers: any[];
  shifts: any[];
  onAssignmentChange: () => void;
}

interface Assignment {
  id: string;
  worker_id: string;
  workstation_id: string;
  shift_id: string;
  date: string;
  role: string;
  worker?: any;
  workstation?: any;
  shift?: any;
}

interface DayCell {
  date: Date;
  dateString: string;
  isToday: boolean;
  morningAssignments: Assignment[];
  afternoonAssignments: Assignment[];
}

export function WeeklyPlanner({ workstations, workers, shifts, onAssignmentChange }: WeeklyPlannerProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const locale = language === 'es' ? es : enUS;
  
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: string; shiftId: string } | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const morningShift = shifts.find(s => 
    s.name.toLowerCase().includes('morning') || s.name.toLowerCase().includes('mañana')
  );
  const afternoonShift = shifts.find(s => 
    s.name.toLowerCase().includes('afternoon') || s.name.toLowerCase().includes('tarde')
  );

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE', { locale }),
      dayNumber: format(date, 'd'),
      isToday: isSameDay(date, new Date())
    };
  });

  useEffect(() => {
    fetchWeekAssignments();
  }, [weekStart]);

  const fetchWeekAssignments = async () => {
    setLoading(true);
    const startDate = format(weekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('worker_assignments')
      .select('*, worker:workers(*), workstation:workstations(*), shift:shifts(*)')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } else {
      setAssignments(data || []);
    }
    setLoading(false);
  };

  const getAssignmentsForCell = (stationId: string, dateString: string, shiftId: string) => {
    return assignments.filter(a => 
      a.workstation_id === stationId && 
      a.date === dateString && 
      a.shift_id === shiftId
    );
  };

  const handleCellClick = (stationId: string, dateString: string, shiftId: string) => {
    setSelectedStation(stationId);
    setSelectedCell({ date: dateString, shiftId });
    
    // Find workers that can work this station
    const station = workstations.find(w => w.id === stationId);
    const stationType = station?.type || 'workshop';
    
    const eligibleWorkers = workers.filter(w => {
      const specialties = w.specialty || ['workshop'];
      const isEligible = specialties.includes(stationType);
      // Check if already assigned this shift on this day
      const alreadyAssigned = assignments.some(a => 
        a.worker_id === w.id && 
        a.date === dateString && 
        a.shift_id === shiftId
      );
      return isEligible && !alreadyAssigned;
    });
    
    setAvailableWorkers(eligibleWorkers);
  };

  const handleAssignWorker = async (workerId: string) => {
    if (!selectedStation || !selectedCell) return;

    const { error } = await supabase
      .from('worker_assignments')
      .insert({
        worker_id: workerId,
        workstation_id: selectedStation,
        shift_id: selectedCell.shiftId,
        date: selectedCell.date,
        role: 'operator'
      });

    if (error) {
      toast({ title: 'Error assigning worker', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'es' ? 'Trabajador asignado' : 'Worker assigned' });
      fetchWeekAssignments();
      onAssignmentChange();
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('worker_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      toast({ title: 'Error removing assignment', variant: 'destructive' });
    } else {
      fetchWeekAssignments();
      onAssignmentChange();
    }
  };

  const handleCopyDay = async (fromDate: string, toDate: string) => {
    const dayAssignments = assignments.filter(a => a.date === fromDate);
    
    for (const assignment of dayAssignments) {
      await supabase.from('worker_assignments').insert({
        worker_id: assignment.worker_id,
        workstation_id: assignment.workstation_id,
        shift_id: assignment.shift_id,
        date: toDate,
        role: assignment.role
      });
    }
    
    toast({ title: language === 'es' ? 'Día copiado' : 'Day copied' });
    fetchWeekAssignments();
  };

  const navigateWeek = (direction: number) => {
    setWeekStart(prev => addDays(prev, direction * 7));
    setSelectedCell(null);
    setSelectedStation(null);
  };

  const groupedStations = workstations.reduce((acc, station) => {
    const type = station.type || 'workshop';
    if (!acc[type]) acc[type] = [];
    acc[type].push(station);
    return acc;
  }, {} as Record<string, any[]>);

  const stationTypes = ['offset_printer', 'die_cutter', 'guillotine', 'dispatch', 'workshop'];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Week Navigation */}
        <Card className="bg-card/80 border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">
                {language === 'es' ? 'Planificador Semanal' : 'Weekly Planner'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-1 bg-muted rounded-md min-w-[200px] text-center">
                <span className="font-medium text-foreground">
                  {format(weekStart, 'MMM d', { locale })} - {format(addDays(weekStart, 5), 'MMM d, yyyy', { locale })}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                {language === 'es' ? 'Hoy' : 'Today'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50">
                <Sun className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Mañana' : 'Morning'}
              </Badge>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/50">
                <Moon className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Tarde' : 'Afternoon'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Weekly Grid */}
        <div className="grid grid-cols-[200px_1fr_280px] gap-4">
          {/* Main Schedule Grid */}
          <div className="col-span-2">
            <Card className="bg-card/80 border-border overflow-hidden">
              <ScrollArea className="h-[600px]">
                <div className="min-w-[800px]">
                  {/* Header Row */}
                  <div className="grid grid-cols-[180px_repeat(6,1fr)] border-b border-border sticky top-0 bg-card z-10">
                    <div className="p-3 border-r border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        {language === 'es' ? 'Estación' : 'Station'}
                      </span>
                    </div>
                    {weekDays.map(day => (
                      <div 
                        key={day.dateString} 
                        className={`p-2 text-center border-r border-border ${day.isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className="text-xs text-muted-foreground uppercase">{day.dayName}</div>
                        <div className={`text-lg font-bold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                          {day.dayNumber}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Station Rows */}
                  {stationTypes.map(type => {
                    const stations = groupedStations[type] || [];
                    if (stations.length === 0) return null;

                    return stations.map((station: any) => (
                      <div 
                        key={station.id}
                        className="grid grid-cols-[180px_repeat(6,1fr)] border-b border-border/50 hover:bg-muted/30"
                      >
                        {/* Station Name */}
                        <div className="p-2 border-r border-border flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            type === 'offset_printer' ? 'bg-purple-500' :
                            type === 'die_cutter' ? 'bg-pink-500' :
                            type === 'guillotine' ? 'bg-orange-500' :
                            type === 'dispatch' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <span className="text-sm font-medium text-foreground truncate">{station.name}</span>
                        </div>

                        {/* Day Cells */}
                        {weekDays.map(day => {
                          const morningAss = morningShift ? getAssignmentsForCell(station.id, day.dateString, morningShift.id) : [];
                          const afternoonAss = afternoonShift ? getAssignmentsForCell(station.id, day.dateString, afternoonShift.id) : [];
                          
                          return (
                            <div 
                              key={day.dateString} 
                              className={`border-r border-border/50 p-1 ${day.isToday ? 'bg-primary/5' : ''}`}
                            >
                              {/* Morning Shift */}
                              <div 
                                className={`mb-1 p-1 rounded cursor-pointer transition-all ${
                                  selectedCell?.date === day.dateString && 
                                  selectedCell?.shiftId === morningShift?.id && 
                                  selectedStation === station.id
                                    ? 'ring-2 ring-primary bg-amber-500/20'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20'
                                }`}
                                onClick={() => morningShift && handleCellClick(station.id, day.dateString, morningShift.id)}
                              >
                                {morningAss.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {morningAss.map(a => (
                                      <Tooltip key={a.id}>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center justify-between group">
                                            <span className="text-[10px] font-medium text-foreground truncate flex-1">
                                              {a.worker?.name?.split(' ')[0]}
                                            </span>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id); }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded"
                                            >
                                              <X className="w-2.5 h-2.5 text-destructive" />
                                            </button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{a.worker?.name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center justify-center">
                                    <Sun className="w-3 h-3 text-amber-500/40" />
                                  </div>
                                )}
                              </div>

                              {/* Afternoon Shift */}
                              <div 
                                className={`p-1 rounded cursor-pointer transition-all ${
                                  selectedCell?.date === day.dateString && 
                                  selectedCell?.shiftId === afternoonShift?.id && 
                                  selectedStation === station.id
                                    ? 'ring-2 ring-primary bg-indigo-500/20'
                                    : 'bg-indigo-500/10 hover:bg-indigo-500/20'
                                }`}
                                onClick={() => afternoonShift && handleCellClick(station.id, day.dateString, afternoonShift.id)}
                              >
                                {afternoonAss.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {afternoonAss.map(a => (
                                      <Tooltip key={a.id}>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center justify-between group">
                                            <span className="text-[10px] font-medium text-foreground truncate flex-1">
                                              {a.worker?.name?.split(' ')[0]}
                                            </span>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id); }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded"
                                            >
                                              <X className="w-2.5 h-2.5 text-destructive" />
                                            </button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{a.worker?.name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center justify-center">
                                    <Moon className="w-3 h-3 text-indigo-500/40" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Worker Selector Panel */}
          <div>
            <Card className="bg-card/80 border-border p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-foreground">
                  {language === 'es' ? 'Asignar Trabajador' : 'Assign Worker'}
                </h4>
              </div>

              {selectedCell ? (
                <>
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {format(new Date(selectedCell.date), 'EEE, MMM d', { locale })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      {selectedCell.shiftId === morningShift?.id ? (
                        <><Sun className="w-4 h-4 text-amber-500" /><span className="text-amber-400">{language === 'es' ? 'Turno Mañana' : 'Morning Shift'}</span></>
                      ) : (
                        <><Moon className="w-4 h-4 text-indigo-500" /><span className="text-indigo-400">{language === 'es' ? 'Turno Tarde' : 'Afternoon Shift'}</span></>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {workstations.find(w => w.id === selectedStation)?.name}
                    </div>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-2">
                      {availableWorkers.length > 0 ? (
                        availableWorkers.map(worker => (
                          <button
                            key={worker.id}
                            onClick={() => handleAssignWorker(worker.id)}
                            className="w-full p-2 bg-muted/30 hover:bg-primary/20 rounded-lg transition-all text-left group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                                {worker.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{worker.name}</div>
                                <div className="text-xs text-muted-foreground">{worker.department}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-primary">{worker.overall_rating}</div>
                                {worker.overtime_availability && (
                                  <Sparkles className="w-3 h-3 text-amber-500 ml-auto" />
                                )}
                              </div>
                              <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {language === 'es' ? 'No hay trabajadores disponibles' : 'No available workers'}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {language === 'es' 
                      ? 'Haz clic en una celda para asignar trabajadores' 
                      : 'Click a cell to assign workers'}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
