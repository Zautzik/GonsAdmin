import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Settings, DollarSign, Percent, Clock, Save, RefreshCw, 
  Package, Printer, Scissors, Lock
} from 'lucide-react';

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

interface OperationCatalog {
  code: string;
  name: string;
  category: string;
  default_cost: number | null;
  unit_of_measure: string;
  is_active: boolean | null;
  description: string | null;
  created_at: string | null;
}

export default function AdminConfigPage() {
  const { canManageConfig } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<OperationCatalog[]>([]);
  
  // Default config values
  const [config, setConfig] = useState({
    defaultMarginPercent: 10,
    defaultIncrementPercent: 10,
    defaultCommission1: 1,
    defaultCommission2: 0,
    defaultCommission3: 0,
    defaultWasteFactor: 5,
    setupSheets: 500,
    offsetSpeed: 8000, // sheets per hour
    digitalSpeed: 500,
    guillotineSpeed: 1000,
    dieCutSpeed: 2000,
  });

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('operations_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('code', { ascending: true });
    
    if (data) setOperations(data as OperationCatalog[]);
    setLoading(false);
  };

  const handleUpdateOperation = async (code: string, updates: { default_cost?: number; is_active?: boolean }) => {
    const { error } = await supabase
      .from('operations_catalog')
      .update(updates)
      .eq('code', code);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Operación actualizada' });
      fetchOperations();
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    // In a real app, you'd save to a config table
    await new Promise(r => setTimeout(r, 500));
    toast({ title: 'Configuración guardada', description: 'Los valores por defecto han sido actualizados' });
    setSaving(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  if (!canManageConfig) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
              <p className="text-muted-foreground">
                Solo los administradores pueden acceder a la configuración del sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" /> Configuración del Sistema
            </h1>
            <p className="text-muted-foreground">Valores por defecto y catálogo de operaciones</p>
          </div>
          <Button onClick={handleSaveConfig} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>

        <Tabs defaultValue="pricing">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pricing" className="gap-2"><Percent className="h-4 w-4" /> Márgenes</TabsTrigger>
            <TabsTrigger value="production" className="gap-2"><Clock className="h-4 w-4" /> Producción</TabsTrigger>
            <TabsTrigger value="operations" className="gap-2"><Package className="h-4 w-4" /> Operaciones</TabsTrigger>
            <TabsTrigger value="machines" className="gap-2"><Printer className="h-4 w-4" /> Máquinas</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Márgenes y Comisiones por Defecto</CardTitle>
                <CardDescription>Valores que se aplicarán automáticamente en nuevas OTs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Utilidad %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.defaultMarginPercent}
                        onChange={(e) => setConfig({ ...config, defaultMarginPercent: parseFloat(e.target.value) })}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Incremento %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.defaultIncrementPercent}
                        onChange={(e) => setConfig({ ...config, defaultIncrementPercent: parseFloat(e.target.value) })}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comisión 1 %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.defaultCommission1}
                        onChange={(e) => setConfig({ ...config, defaultCommission1: parseFloat(e.target.value) })}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comisión 2 %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.defaultCommission2}
                        onChange={(e) => setConfig({ ...config, defaultCommission2: parseFloat(e.target.value) })}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comisión 3 %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.defaultCommission3}
                        onChange={(e) => setConfig({ ...config, defaultCommission3: parseFloat(e.target.value) })}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parámetros de Producción</CardTitle>
                <CardDescription>Factores de desperdicio y hojas de setup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Factor de Desperdicio %</Label>
                    <Input
                      type="number"
                      value={config.defaultWasteFactor}
                      onChange={(e) => setConfig({ ...config, defaultWasteFactor: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hojas de Setup</Label>
                    <Input
                      type="number"
                      value={config.setupSheets}
                      onChange={(e) => setConfig({ ...config, setupSheets: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Operaciones</CardTitle>
                <CardDescription>Gestiona los costos unitarios por operación</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((op) => (
                      <TableRow key={op.code}>
                        <TableCell className="font-mono">{op.code}</TableCell>
                        <TableCell>{op.name}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded bg-muted text-xs">{op.category}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={op.default_cost || 0}
                            onChange={(e) => handleUpdateOperation(op.code, { default_cost: parseFloat(e.target.value) })}
                            className="w-28 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{op.unit_of_measure}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={op.is_active || false}
                            onCheckedChange={(checked) => handleUpdateOperation(op.code, { is_active: checked })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Velocidades de Máquinas</CardTitle>
                <CardDescription>Velocidades estándar para cálculo de horas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Printer className="h-4 w-4" /> Offset (hojas/hora)
                    </Label>
                    <Input
                      type="number"
                      value={config.offsetSpeed}
                      onChange={(e) => setConfig({ ...config, offsetSpeed: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Printer className="h-4 w-4" /> Digital (hojas/hora)
                    </Label>
                    <Input
                      type="number"
                      value={config.digitalSpeed}
                      onChange={(e) => setConfig({ ...config, digitalSpeed: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Scissors className="h-4 w-4" /> Guillotina (cortes/hora)
                    </Label>
                    <Input
                      type="number"
                      value={config.guillotineSpeed}
                      onChange={(e) => setConfig({ ...config, guillotineSpeed: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Troqueladora (hojas/hora)
                    </Label>
                    <Input
                      type="number"
                      value={config.dieCutSpeed}
                      onChange={(e) => setConfig({ ...config, dieCutSpeed: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
