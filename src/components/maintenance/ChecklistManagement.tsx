import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Calendar, Clock, FileText, CheckCircle2, Plus, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Machine {
  id: string;
  name: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  frequency: string;
  machine_id: string;
  machine_name?: string;
  tasks: { id: string; task_number: number; description: string; estimated_minutes: number }[];
}

export default function ChecklistManagement() {
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [workOrderDate, setWorkOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [workOrderPriority, setWorkOrderPriority] = useState('3');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch machines
    const { data: machinesData } = await supabase.from('machines').select('id, name');
    setMachines(machinesData || []);

    // Create sample checklist templates (since maintenance tables don't exist)
    const sampleChecklists: ChecklistTemplate[] = (machinesData || []).slice(0, 4).map((machine, index) => ({
      id: `checklist-${index}`,
      name: `Mantenimiento ${index % 2 === 0 ? 'Diario' : 'Semanal'} - ${machine.name}`,
      description: `Checklist de mantenimiento para ${machine.name}`,
      frequency: index % 2 === 0 ? 'daily' : 'weekly',
      machine_id: machine.id,
      machine_name: machine.name,
      tasks: [
        { id: `task-${index}-1`, task_number: 1, description: 'Verificar niveles de aceite', estimated_minutes: 5 },
        { id: `task-${index}-2`, task_number: 2, description: 'Limpiar filtros', estimated_minutes: 10 },
        { id: `task-${index}-3`, task_number: 3, description: 'Inspección visual', estimated_minutes: 5 },
      ]
    }));
    
    setChecklists(sampleChecklists);
    setLoading(false);
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'weekly': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'biweekly': return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      case 'monthly': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTotalTime = (tasks: { estimated_minutes: number }[]) => {
    return tasks?.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0) || 0;
  };

  const createWorkOrder = async () => {
    if (!selectedChecklist) return;
    
    const checklist = checklists.find(c => c.id === selectedChecklist);
    if (!checklist) return;

    // Simulate work order creation
    toast.success(`Orden de trabajo creada para ${checklist.name}`);
    setDialogOpen(false);
    setSelectedChecklist(null);
  };

  // Group checklists by machine
  const groupedChecklists = checklists.reduce((acc, checklist) => {
    const machineName = checklist.machine_name || 'Sin Máquina';
    if (!acc[machineName]) acc[machineName] = [];
    acc[machineName].push(checklist);
    return acc;
  }, {} as Record<string, ChecklistTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Plantillas de Checklist
          </h2>
          <p className="text-muted-foreground">Gestiona las plantillas de mantenimiento preventivo</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {checklists.length} checklists
        </Badge>
      </div>

      {Object.keys(groupedChecklists).length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay plantillas de checklist</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear Plantilla
            </Button>
          </div>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedChecklists).map(([machineName, machineChecklists]) => (
            <AccordionItem key={machineName} value={machineName} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{machineName}</span>
                  <Badge variant="outline" className="ml-2">
                    {machineChecklists.length} plantillas
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {machineChecklists.map(checklist => (
                    <Card key={checklist.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{checklist.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {checklist.description}
                            </p>
                          </div>
                          <Badge variant="outline" className={getFrequencyColor(checklist.frequency)}>
                            {checklist.frequency}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {checklist.tasks?.length || 0} tareas
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            ~{getTotalTime(checklist.tasks)} min
                          </div>
                        </div>

                        <Dialog open={dialogOpen && selectedChecklist === checklist.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) setSelectedChecklist(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => setSelectedChecklist(checklist.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Crear Orden de Trabajo
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Crear Orden de Trabajo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Checklist</Label>
                                <Input value={checklist.name} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Máquina</Label>
                                <Input value={checklist.machine_name} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Fecha Programada</Label>
                                <Input 
                                  type="date" 
                                  value={workOrderDate}
                                  onChange={(e) => setWorkOrderDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Prioridad</Label>
                                <Select value={workOrderPriority} onValueChange={setWorkOrderPriority}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">Baja (1)</SelectItem>
                                    <SelectItem value="2">Normal (2)</SelectItem>
                                    <SelectItem value="3">Media (3)</SelectItem>
                                    <SelectItem value="4">Alta (4)</SelectItem>
                                    <SelectItem value="5">Crítica (5)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={createWorkOrder} className="w-full">
                                <Calendar className="h-4 w-4 mr-2" />
                                Programar Orden
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
