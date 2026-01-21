import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Clock, Play, CheckCircle, Wrench } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WorkOrder {
  id: string;
  status: string;
  priority: number;
  scheduled_date: string;
  started_at: string | null;
  machine_name: string;
  checklist_name: string;
  tasks: TaskCompletion[];
}

interface TaskCompletion {
  id: string;
  task_number: number;
  description: string;
  estimated_minutes: number;
  completed: boolean;
  notes: string;
}

export default function WorkOrderExecution() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    setLoading(true);
    
    // Fetch machines to create sample work orders
    const { data: machines } = await supabase.from('machines').select('id, name');
    
    // Create sample work orders since maintenance tables don't exist
    const sampleOrders: WorkOrder[] = (machines || []).slice(0, 3).map((machine, index) => ({
      id: `wo-${index}`,
      status: index === 0 ? 'in_progress' : 'pending',
      priority: 3 + index,
      scheduled_date: new Date().toISOString(),
      started_at: index === 0 ? new Date().toISOString() : null,
      machine_name: machine.name,
      checklist_name: `Mantenimiento ${index % 2 === 0 ? 'Diario' : 'Semanal'}`,
      tasks: [
        { id: `t-${index}-1`, task_number: 1, description: 'Verificar niveles de aceite', estimated_minutes: 5, completed: false, notes: '' },
        { id: `t-${index}-2`, task_number: 2, description: 'Limpiar filtros', estimated_minutes: 10, completed: false, notes: '' },
        { id: `t-${index}-3`, task_number: 3, description: 'Inspección visual general', estimated_minutes: 5, completed: false, notes: '' },
      ]
    }));
    
    setWorkOrders(sampleOrders);
    setLoading(false);
  };

  const startWorkOrder = (order: WorkOrder) => {
    setWorkOrders(prev => prev.map(wo => 
      wo.id === order.id 
        ? { ...wo, status: 'in_progress', started_at: new Date().toISOString() }
        : wo
    ));
    toast.success('Orden de trabajo iniciada');
    openWorkOrder({ ...order, status: 'in_progress', started_at: new Date().toISOString() });
  };

  const openWorkOrder = (order: WorkOrder) => {
    setSelectedOrder(order);
    const notes: Record<string, string> = {};
    order.tasks.forEach(task => {
      notes[task.id] = task.notes || '';
    });
    setTaskNotes(notes);
    setExecuting(true);
  };

  const toggleTaskCompletion = (taskId: string) => {
    if (!selectedOrder) return;
    
    setSelectedOrder(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      };
    });
  };

  const completeWorkOrder = () => {
    if (!selectedOrder) return;

    const allCompleted = selectedOrder.tasks.every(t => t.completed);
    if (!allCompleted) {
      toast.error('Por favor completa todas las tareas primero');
      return;
    }

    setWorkOrders(prev => prev.filter(wo => wo.id !== selectedOrder.id));
    toast.success('Orden de trabajo completada');
    setExecuting(false);
    setSelectedOrder(null);
  };

  const getCompletionProgress = () => {
    if (!selectedOrder || selectedOrder.tasks.length === 0) return 0;
    const completed = selectedOrder.tasks.filter(t => t.completed).length;
    return (completed / selectedOrder.tasks.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500/20 text-blue-600';
      case 'pending': return 'bg-yellow-500/20 text-yellow-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-500/20 text-red-600';
    if (priority >= 3) return 'bg-orange-500/20 text-orange-600';
    return 'bg-blue-500/20 text-blue-600';
  };

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
            Órdenes de Trabajo Activas
          </h2>
          <p className="text-muted-foreground">Ejecuta y completa las órdenes de mantenimiento</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {workOrders.length} activas
        </Badge>
      </div>

      {workOrders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">¡Todas las tareas de mantenimiento completadas!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workOrders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{order.machine_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.checklist_name}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={getPriorityColor(order.priority)}>
                      P{order.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(order.scheduled_date).toLocaleDateString()}
                  </div>
                </div>

                {order.status === 'pending' ? (
                  <Button onClick={() => startWorkOrder(order)} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                ) : (
                  <Button onClick={() => openWorkOrder(order)} variant="outline" className="w-full">
                    <Wrench className="h-4 w-4 mr-2" />
                    Continuar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Execution Dialog */}
      <Dialog open={executing} onOpenChange={setExecuting}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {selectedOrder?.checklist_name}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">
                    {selectedOrder.tasks.filter(t => t.completed).length} / {selectedOrder.tasks.length} tareas
                  </span>
                </div>
                <Progress value={getCompletionProgress()} className="h-2" />
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {selectedOrder.tasks.map(task => (
                  <Card key={task.id} className={`p-4 transition-colors ${task.completed ? 'bg-green-500/10' : ''}`}>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTaskCompletion(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.task_number}. {task.description}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            ~{task.estimated_minutes} min
                          </Badge>
                        </div>
                        {!task.completed && (
                          <Textarea
                            placeholder="Agregar notas (opcional)"
                            value={taskNotes[task.id] || ''}
                            onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                            className="text-sm"
                            rows={2}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Complete Button */}
              <Button
                onClick={completeWorkOrder}
                className="w-full"
                disabled={!selectedOrder.tasks.every(t => t.completed)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completar Orden de Trabajo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
