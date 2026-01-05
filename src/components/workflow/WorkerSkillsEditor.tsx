import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Users, 
  Settings, 
  Search, 
  Printer, 
  Scissors, 
  Layers, 
  Wrench, 
  Truck,
  Star,
  Check,
  X,
  Phone,
  Hash,
  Save,
  ChevronRight
} from "lucide-react";

interface WorkerSkillsEditorProps {
  workers: any[];
  onUpdate: () => void;
}

const MACHINE_TYPES = [
  { value: 'offset_printer', label: 'Offset Printer', labelEs: 'Impresora Offset', icon: Printer, color: 'bg-purple-500' },
  { value: 'die_cutter', label: 'Die Cutter', labelEs: 'Troquelador', icon: Layers, color: 'bg-pink-500' },
  { value: 'guillotine', label: 'Guillotine', labelEs: 'Guillotina', icon: Scissors, color: 'bg-orange-500' },
  { value: 'dispatch', label: 'Dispatch', labelEs: 'Despacho', icon: Truck, color: 'bg-blue-500' },
  { value: 'workshop', label: 'Workshop', labelEs: 'Taller', icon: Wrench, color: 'bg-green-500' },
];

const WORKER_ROLES = [
  { value: 'operator', label: 'Operator', labelEs: 'Operador' },
  { value: 'master', label: 'Master', labelEs: 'Maestro' },
  { value: 'technician', label: 'Technician', labelEs: 'Técnico' },
  { value: 'assistant', label: 'Assistant', labelEs: 'Asistente' },
  { value: 'driver', label: 'Driver', labelEs: 'Conductor' },
];

export function WorkerSkillsEditor({ workers, onUpdate }: WorkerSkillsEditorProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.worker_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectWorker = (worker: any) => {
    setSelectedWorker(worker);
    setEditForm({
      name: worker.name,
      phone: worker.phone || '',
      worker_code: worker.worker_code || '',
      worker_role: worker.worker_role || 'operator',
      specialty: worker.specialty || [],
      overtime_availability: worker.overtime_availability ?? true,
      department: worker.department,
    });
    setDialogOpen(true);
  };

  const toggleSkill = (machineType: string) => {
    const currentSkills = editForm.specialty || [];
    const newSkills = currentSkills.includes(machineType)
      ? currentSkills.filter((s: string) => s !== machineType)
      : [...currentSkills, machineType];
    setEditForm({ ...editForm, specialty: newSkills });
  };

  const handleSave = async () => {
    if (!selectedWorker) return;
    setSaving(true);

    const { error } = await supabase
      .from('workers')
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        worker_code: editForm.worker_code || null,
        worker_role: editForm.worker_role,
        specialty: editForm.specialty,
        overtime_availability: editForm.overtime_availability,
        department: editForm.department,
      })
      .eq('id', selectedWorker.id);

    if (error) {
      toast({ title: 'Error saving worker', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'es' ? 'Trabajador actualizado' : 'Worker updated' });
      onUpdate();
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const getSkillBadges = (worker: any) => {
    const skills = worker.specialty || [];
    return skills.slice(0, 3).map((skill: string) => {
      const machine = MACHINE_TYPES.find(m => m.value === skill);
      if (!machine) return null;
      return (
        <Badge key={skill} variant="outline" className={`${machine.color}/20 text-xs border-${machine.color}/50`}>
          {language === 'es' ? machine.labelEs : machine.label}
        </Badge>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Workers List */}
      <Card className="lg:col-span-2 bg-card/80 border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">
              {language === 'es' ? 'Configurar Trabajadores' : 'Configure Workers'}
            </h3>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            {workers.length} {language === 'es' ? 'trabajadores' : 'workers'}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'es' ? 'Buscar trabajador...' : 'Search worker...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/50 border-border"
          />
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pr-2">
            {filteredWorkers.map(worker => (
              <div
                key={worker.id}
                onClick={() => handleSelectWorker(worker)}
                className="p-3 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-all border border-transparent hover:border-primary/50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-bold">
                    {worker.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{worker.name}</span>
                      {worker.worker_code && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          #{worker.worker_code}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{worker.department}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs capitalize text-muted-foreground">{worker.worker_role || 'operator'}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {getSkillBadges(worker)}
                      {(worker.specialty?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{worker.specialty.length - 3}
                        </Badge>
                      )}
                      {(!worker.specialty || worker.specialty.length === 0) && (
                        <span className="text-xs text-muted-foreground italic">
                          {language === 'es' ? 'Sin habilidades configuradas' : 'No skills configured'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-foreground">{worker.overall_rating}</span>
                    </div>
                    {worker.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{worker.phone.slice(-4)}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Quick Guide */}
      <Card className="bg-card/80 border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-foreground">
            {language === 'es' ? 'Guía Rápida' : 'Quick Guide'}
          </h4>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="p-3 bg-muted/30 rounded-lg">
            <h5 className="font-medium text-foreground mb-2">
              {language === 'es' ? '🔧 Habilidades de Máquina' : '🔧 Machine Skills'}
            </h5>
            <p className="text-xs">
              {language === 'es' 
                ? 'Define en qué máquinas puede trabajar cada operador. Solo podrán ser asignados a estaciones compatibles.'
                : 'Define which machines each operator can work on. They can only be assigned to compatible stations.'}
            </p>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <h5 className="font-medium text-foreground mb-2">
              {language === 'es' ? '📱 Código WhatsApp' : '📱 WhatsApp Code'}
            </h5>
            <p className="text-xs">
              {language === 'es' 
                ? 'El código único permite identificar reportes de WhatsApp. El trabajador debe usar este código al iniciar su mensaje.'
                : 'The unique code identifies WhatsApp reports. Workers should use this code when starting their message.'}
            </p>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <h5 className="font-medium text-foreground mb-2">
              {language === 'es' ? '⏰ Horas Extra' : '⏰ Overtime'}
            </h5>
            <p className="text-xs">
              {language === 'es' 
                ? 'Los trabajadores con disponibilidad de horas extra pueden trabajar ambos turnos (mañana y tarde).'
                : 'Workers with overtime availability can work both shifts (morning and afternoon).'}
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-medium text-foreground">
              {language === 'es' ? 'Tipos de Máquina' : 'Machine Types'}
            </h5>
            {MACHINE_TYPES.map(machine => {
              const Icon = machine.icon;
              return (
                <div key={machine.value} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${machine.color} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs">{language === 'es' ? machine.labelEs : machine.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {language === 'es' ? 'Editar Trabajador' : 'Edit Worker'}
            </DialogTitle>
          </DialogHeader>

          {selectedWorker && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'es' ? 'Nombre' : 'Name'}</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div>
                  <Label>{language === 'es' ? 'Departamento' : 'Department'}</Label>
                  <Input
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {language === 'es' ? 'Teléfono WhatsApp' : 'WhatsApp Phone'}
                  </Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+506 8888 8888"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {language === 'es' ? 'Código Único' : 'Unique Code'}
                  </Label>
                  <Input
                    value={editForm.worker_code}
                    onChange={(e) => setEditForm({ ...editForm, worker_code: e.target.value.toUpperCase() })}
                    placeholder="JD01"
                    maxLength={10}
                    className="bg-muted/50 border-border uppercase"
                  />
                </div>
              </div>

              <div>
                <Label>{language === 'es' ? 'Rol' : 'Role'}</Label>
                <Select 
                  value={editForm.worker_role} 
                  onValueChange={(v) => setEditForm({ ...editForm, worker_role: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {language === 'es' ? role.labelEs : role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Machine Skills */}
              <div>
                <Label className="mb-2 block">
                  {language === 'es' ? 'Habilidades de Máquina' : 'Machine Skills'}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {MACHINE_TYPES.map(machine => {
                    const Icon = machine.icon;
                    const isSelected = editForm.specialty?.includes(machine.value);
                    return (
                      <button
                        key={machine.value}
                        type="button"
                        onClick={() => toggleSkill(machine.value)}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          isSelected 
                            ? `${machine.color}/20 border-primary bg-primary/10` 
                            : 'border-border bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${machine.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {language === 'es' ? machine.labelEs : machine.label}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overtime */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-foreground">
                    {language === 'es' ? 'Disponible para Horas Extra' : 'Available for Overtime'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'es' 
                      ? 'Puede trabajar turnos adicionales'
                      : 'Can work additional shifts'}
                  </p>
                </div>
                <Switch
                  checked={editForm.overtime_availability}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, overtime_availability: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving 
                    ? (language === 'es' ? 'Guardando...' : 'Saving...') 
                    : (language === 'es' ? 'Guardar' : 'Save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
