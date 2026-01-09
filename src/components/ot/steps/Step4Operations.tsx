import { useEffect, useState } from 'react';
import { useOTFormStore, Operation } from '@/stores/otFormStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, ArrowRight, Plus, Trash2, GripVertical, Calculator, Package, Wrench, Truck, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CatalogOperation {
  code: string;
  name: string;
  category: string;
  unit_of_measure: string;
  default_cost: number;
  description: string | null;
}

interface Step4Props {
  onNext: () => void;
  onPrev: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  MATERIALS: 'hsl(var(--chart-1))',
  PREPRESS: 'hsl(var(--chart-2))',
  PRINTING: 'hsl(var(--chart-3))',
  FINISHING: 'hsl(var(--chart-4))',
  THIRD_PARTY: 'hsl(var(--chart-5))',
  OTHER: 'hsl(var(--muted-foreground))',
};

const CATEGORY_ICONS: Record<string, typeof Package> = {
  MATERIALS: Package,
  PREPRESS: Calculator,
  PRINTING: Calculator,
  FINISHING: Wrench,
  THIRD_PARTY: Truck,
  OTHER: MoreHorizontal,
};

export default function Step4Operations({ onNext, onPrev }: Step4Props) {
  const { operations, calculations, specifications, setOperations, addOperation, updateOperation, removeOperation, calculatePricing } = useOTFormStore();
  const [catalog, setCatalog] = useState<CatalogOperation[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (catalog.length > 0 && operations.length === 0) {
      generateDefaultOperations();
    }
  }, [catalog, specifications, calculations]);

  const fetchCatalog = async () => {
    const { data } = await supabase
      .from('operations_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });
    
    if (data) setCatalog(data);
  };

  const generateDefaultOperations = () => {
    const defaultOps: Operation[] = [];
    let seq = 1;

    // Add substrate
    const substrate = catalog.find(c => c.code === '00001');
    if (substrate && calculations.substrateKg) {
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: substrate.code,
        name: substrate.name,
        category: substrate.category,
        sequenceOrder: seq++,
        quantityBudgeted: calculations.substrateKg,
        unitCostBudgeted: substrate.default_cost,
        totalCostBudgeted: calculations.substrateKg * substrate.default_cost,
        unitOfMeasure: substrate.unit_of_measure,
        notes: '',
      });
    }

    // Add CTP
    const ctp = catalog.find(c => c.code === '00002');
    if (ctp && calculations.ctpPlates) {
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: ctp.code,
        name: ctp.name,
        category: ctp.category,
        sequenceOrder: seq++,
        quantityBudgeted: calculations.ctpPlates,
        unitCostBudgeted: ctp.default_cost,
        totalCostBudgeted: calculations.ctpPlates * ctp.default_cost,
        unitOfMeasure: ctp.unit_of_measure,
        notes: '',
      });
    }

    // Add matricería
    const matri = catalog.find(c => c.code === '00061');
    if (matri) {
      const hours = Math.max(0.5, calculations.printingHoursEstimated * 0.3);
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: matri.code,
        name: matri.name,
        category: matri.category,
        sequenceOrder: seq++,
        quantityBudgeted: Math.round(hours * 100) / 100,
        unitCostBudgeted: matri.default_cost,
        totalCostBudgeted: hours * matri.default_cost,
        unitOfMeasure: matri.unit_of_measure,
        notes: '',
      });
    }

    // Add printing (offset or digital based on quantity)
    const printCode = calculations.totalSheets > 500 ? '00005' : '00006';
    const printing = catalog.find(c => c.code === printCode);
    if (printing) {
      const qty = printCode === '00005' ? calculations.printingHoursEstimated : calculations.totalSheets;
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: printing.code,
        name: printing.name,
        category: printing.category,
        sequenceOrder: seq++,
        quantityBudgeted: Math.round(qty * 100) / 100,
        unitCostBudgeted: printing.default_cost,
        totalCostBudgeted: qty * printing.default_cost,
        unitOfMeasure: printing.unit_of_measure,
        notes: '',
      });
    }

    // Add corte inicial
    const corteIni = catalog.find(c => c.code === '00057');
    if (corteIni) {
      const cuts = Math.ceil(calculations.totalSheets / 100) * 2;
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: corteIni.code,
        name: corteIni.name,
        category: corteIni.category,
        sequenceOrder: seq++,
        quantityBudgeted: cuts,
        unitCostBudgeted: corteIni.default_cost,
        totalCostBudgeted: cuts * corteIni.default_cost,
        unitOfMeasure: corteIni.unit_of_measure,
        notes: '',
      });
    }

    // Add finishing operations based on specs
    if (specifications.finishingOperations.includes('troquelado')) {
      const troquel = catalog.find(c => c.code === '00009');
      const molde = catalog.find(c => c.code === '00034');
      if (molde) {
        defaultOps.push({
          id: crypto.randomUUID(),
          operationCode: molde.code,
          name: molde.name,
          category: molde.category,
          sequenceOrder: seq++,
          quantityBudgeted: 1,
          unitCostBudgeted: molde.default_cost,
          totalCostBudgeted: molde.default_cost,
          unitOfMeasure: molde.unit_of_measure,
          notes: '',
        });
      }
      if (troquel) {
        const hours = Math.max(1, calculations.totalSheets / 2000);
        defaultOps.push({
          id: crypto.randomUUID(),
          operationCode: troquel.code,
          name: troquel.name,
          category: troquel.category,
          sequenceOrder: seq++,
          quantityBudgeted: Math.round(hours * 100) / 100,
          unitCostBudgeted: troquel.default_cost,
          totalCostBudgeted: hours * troquel.default_cost,
          unitOfMeasure: troquel.unit_of_measure,
          notes: '',
        });
      }
    }

    // Add corte final
    const corteFin = catalog.find(c => c.code === '00056');
    if (corteFin) {
      const cuts = Math.ceil(calculations.totalSheets / 50) * (calculations.bocasPerSheet || 1);
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: corteFin.code,
        name: corteFin.name,
        category: corteFin.category,
        sequenceOrder: seq++,
        quantityBudgeted: cuts,
        unitCostBudgeted: corteFin.default_cost,
        totalCostBudgeted: cuts * corteFin.default_cost,
        unitOfMeasure: corteFin.unit_of_measure,
        notes: '',
      });
    }

    // Add flete
    const flete = catalog.find(c => c.code === '00021');
    if (flete) {
      defaultOps.push({
        id: crypto.randomUUID(),
        operationCode: flete.code,
        name: flete.name,
        category: flete.category,
        sequenceOrder: seq++,
        quantityBudgeted: 0.5,
        unitCostBudgeted: flete.default_cost,
        totalCostBudgeted: 0.5 * flete.default_cost,
        unitOfMeasure: flete.unit_of_measure,
        notes: '',
      });
    }

    setOperations(defaultOps);
  };

  const handleAddOperation = (catOp: CatalogOperation) => {
    addOperation({
      id: crypto.randomUUID(),
      operationCode: catOp.code,
      name: catOp.name,
      category: catOp.category,
      sequenceOrder: operations.length + 1,
      quantityBudgeted: 1,
      unitCostBudgeted: catOp.default_cost,
      totalCostBudgeted: catOp.default_cost,
      unitOfMeasure: catOp.unit_of_measure,
      notes: '',
    });
    setShowAddDialog(false);
  };

  const handleQtyChange = (id: string, qty: number) => {
    const op = operations.find(o => o.id === id);
    if (op) {
      updateOperation(id, { quantityBudgeted: qty, totalCostBudgeted: qty * op.unitCostBudgeted });
    }
  };

  const handleCostChange = (id: string, cost: number) => {
    const op = operations.find(o => o.id === id);
    if (op) {
      updateOperation(id, { unitCostBudgeted: cost, totalCostBudgeted: op.quantityBudgeted * cost });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  const categoryTotals = operations.reduce((acc, op) => {
    acc[op.category] = (acc[op.category] || 0) + op.totalCostBudgeted;
    return acc;
  }, {} as Record<string, number>);

  const totalCost = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const pieData = Object.entries(categoryTotals).map(([category, value]) => ({
    name: category,
    value,
    percent: totalCost > 0 ? (value / totalCost * 100).toFixed(1) : 0,
  }));

  const filteredCatalog = catalog.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Operaciones del Trabajo
              </CardTitle>
              <CardDescription>Detalle de costos por operación</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Agregar Operación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Agregar Operación</DialogTitle>
                </DialogHeader>
                <Command>
                  <CommandInput 
                    placeholder="Buscar por código o nombre..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron operaciones.</CommandEmpty>
                    {['PREPRESS', 'PRINTING', 'FINISHING', 'MATERIALS', 'THIRD_PARTY', 'OTHER'].map(cat => {
                      const catOps = filteredCatalog.filter(c => c.category === cat);
                      if (catOps.length === 0) return null;
                      return (
                        <CommandGroup key={cat} heading={cat}>
                          {catOps.map(op => (
                            <CommandItem
                              key={op.code}
                              onSelect={() => handleAddOperation(op)}
                              className="flex justify-between"
                            >
                              <span>{op.code} - {op.name}</span>
                              <span className="text-muted-foreground">{formatCurrency(op.default_cost)}/{op.unit_of_measure}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op, index) => {
                const Icon = CATEGORY_ICONS[op.category] || Calculator;
                return (
                  <TableRow key={op.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{op.operationCode}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{op.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={op.quantityBudgeted}
                        onChange={(e) => handleQtyChange(op.id, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{op.unitOfMeasure}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="1"
                        value={op.unitCostBudgeted}
                        onChange={(e) => handleCostChange(op.id, parseFloat(e.target.value) || 0)}
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(op.totalCostBudgeted)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeOperation(op.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {operations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay operaciones. Haz clic en "Agregar Operación" para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryTotals).map(([category, value]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    />
                    <span>{category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${percent}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button onClick={() => { calculatePricing(); onNext(); }} className="gap-2">
          Siguiente <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}