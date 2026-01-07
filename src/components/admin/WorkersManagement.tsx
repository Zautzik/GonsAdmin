import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WorkersManagementProps {
  onUpdate: () => void;
}

const WorkersManagement = ({ onUpdate }: WorkersManagementProps) => {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: 'press',
    hourly_salary: 0,
    specialty: [] as string[],
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers' as any)
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Error loading workers');
    } else {
      setWorkers(data || []);
    }
  };

  const handleSubmit = async () => {
    if (editingWorker) {
      const { error } = await supabase
        .from('workers' as any)
        .update(formData as any)
        .eq('id', editingWorker.id);

      if (error) {
        toast.error('Error updating worker');
      } else {
        toast.success('Worker updated successfully');
        fetchWorkers();
        onUpdate();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('workers' as any)
        .insert(formData as any);

      if (error) {
        toast.error('Error creating worker');
      } else {
        toast.success('Worker created successfully');
        fetchWorkers();
        onUpdate();
        resetForm();
      }
    }
  };

  const handleDelete = async (workerId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase
      .from('workers' as any)
      .delete()
      .eq('id', workerId);

    if (error) {
      toast.error('Error deleting worker');
    } else {
      toast.success('Worker deleted successfully');
      fetchWorkers();
      onUpdate();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: 'press',
      hourly_salary: 0,
      specialty: [],
    });
    setEditingWorker(null);
    setShowDialog(false);
  };

  const openEditDialog = (worker: any) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      department: worker.department,
      hourly_salary: worker.hourly_salary || 0,
      specialty: worker.specialty || [],
    });
    setShowDialog(true);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-primary">{t('workersManagement')}</CardTitle>
        <Button onClick={() => setShowDialog(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          {t('addWorker')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <strong>{t('overtimeNote')}:</strong> {t('overtimeDescription')}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('department')}</TableHead>
              <TableHead>{t('specialty')}</TableHead>
              <TableHead>{t('hourlySalary')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell className="font-medium">{worker.name}</TableCell>
                <TableCell>{t(worker.department)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(worker.specialty || []).map((spec: string) => (
                      <span key={spec} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {t(spec)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>${worker.hourly_salary?.toFixed(2) || '0.00'}/hr</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(worker)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(worker.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? t('editWorker') : t('addWorker')}
            </DialogTitle>
            <DialogDescription>
              {editingWorker ? t('editWorkerDescription') : t('addWorkerDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">{t('department')}</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="press">{t('press')}</SelectItem>
                  <SelectItem value="die_cutting">{t('die_cutting')}</SelectItem>
                  <SelectItem value="guillotine">{t('guillotine')}</SelectItem>
                  <SelectItem value="manual_workshop">{t('manual_workshop')}</SelectItem>
                  <SelectItem value="deliveries">{t('deliveries')}</SelectItem>
                  <SelectItem value="pre_press">{t('pre_press')}</SelectItem>
                  <SelectItem value="administration">{t('administration')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('specialty')}</Label>
              <div className="flex flex-wrap gap-2">
                {['die_cutter', 'guillotine', 'offset_printer', 'dispatch', 'workshop'].map((spec) => (
                  <Button
                    key={spec}
                    type="button"
                    variant={formData.specialty.includes(spec) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newSpecialty = formData.specialty.includes(spec)
                        ? formData.specialty.filter((s) => s !== spec)
                        : [...formData.specialty, spec];
                      setFormData({ ...formData, specialty: newSpecialty });
                    }}
                  >
                    {t(spec)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_salary">{t('hourlySalary')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="hourly_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={formData.hourly_salary}
                  onChange={(e) => setFormData({ ...formData, hourly_salary: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('overtimeRateNote')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              {editingWorker ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WorkersManagement;
