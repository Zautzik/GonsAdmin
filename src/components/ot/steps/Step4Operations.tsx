import { useEffect, useState } from 'react';
import { useOTFormStore, Operation } from '@/stores/otFormStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Package, Wrench, Truck, MoreHorizontal, Plus, X, Pencil, Calculator, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import OTFormActions from '../OTFormActions';

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

const CATEGORY_LABELS: Record<string, string> = {
  MATERIALS: 'Materiales',
  PREPRESS: 'Preprensa',
  PRINTING: 'Impresión',
  FINISHING: 'Terminaciones',
  THIRD_PARTY: 'Terceros',
  OTHER: 'Otros',
};

const CATEGORY_ICONS: Record<string, typeof Package> = {
  MATERIALS: Package,
  PREPRESS: Calculator,
  PRINTING: Printer,
  FINISHING: Wrench,
  THIRD_PARTY: Truck,
  OTHER: MoreHorizontal,
};

export default function Step4Operations({ onNext, onPrev }: Step4Props) {
  const { operations, calculations, specifications, setOperations, addOperation, updateOperation, removeOperation, calculatePricing } = useOTFormStore();
  const [catalog, setCatalog] = useState<CatalogOperation[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (catalog.length > 0 && operations.length === 0) {
      generateDefaultOperations();
    }
  }, [catalog, specifications, calculations]);

  // Recalculate pricing when operations change
  useEffect(() => {
    calculatePricing();
  }, [operations]);

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
    setSearchTerm('');
  };

  const handleQtyChange = (id: string, qty: number) => {
    const op = operations.find(o => o.id === id);
    if (op) {
      updateOperation(id, { quantityBudgeted: qty, totalCostBudgeted: qty * op.unitCostBudgeted });
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

  const filteredCatalog = catalog.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Operations List */}
      <div className="space-y-3">
        {operations.map((op) => {
          const Icon = CATEGORY_ICONS[op.category] || Package;
          const isEditing = editingId === op.id;
          
          return (
            <div
              key={op.id}
              className="bg-card border rounded-xl p-4 space-y-3 transition-all hover:shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {CATEGORY_LABELS[op.category] || op.category}
                      </span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="font-medium text-foreground">{op.name}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOperation(op.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Calculation */}
              <div className="text-sm text-muted-foreground">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={op.quantityBudgeted}
                      onChange={(e) => handleQtyChange(op.id, parseFloat(e.target.value) || 0)}
                      className="w-24 h-9"
                      autoFocus
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                    />
                    <span>{op.unitOfMeasure}</span>
                    <span>×</span>
                    <span>{formatCurrency(op.unitCostBudgeted)}/{op.unitOfMeasure}</span>
                  </div>
                ) : (
                  <span>
                    {op.quantityBudgeted.toLocaleString('es-CL', { maximumFractionDigits: 2 })} {op.unitOfMeasure} × {formatCurrency(op.unitCostBudgeted)}/{op.unitOfMeasure}
                  </span>
                )}
              </div>

              {/* Total & Edit */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">
                  Total: {formatCurrency(op.totalCostBudgeted)}
                </span>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={() => setEditingId(op.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar cantidad
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {operations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No hay operaciones aún.</p>
            <p className="text-sm">Las operaciones se generarán automáticamente basándose en los cálculos.</p>
          </div>
        )}
      </div>

      {/* Add Operation Button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <button className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-4 px-6 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors">
            <Plus className="h-5 w-5" />
            <span className="font-medium">Agregar operación</span>
          </button>
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
            <CommandList className="max-h-80">
              <CommandEmpty>No se encontraron operaciones.</CommandEmpty>
              {['MATERIALS', 'PREPRESS', 'PRINTING', 'FINISHING', 'THIRD_PARTY', 'OTHER'].map(cat => {
                const catOps = filteredCatalog.filter(c => c.category === cat);
                if (catOps.length === 0) return null;
                return (
                  <CommandGroup key={cat} heading={CATEGORY_LABELS[cat] || cat}>
                    {catOps.map(op => (
                      <CommandItem
                        key={op.code}
                        onSelect={() => handleAddOperation(op)}
                        className="flex justify-between cursor-pointer"
                      >
                        <span>{op.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatCurrency(op.default_cost)}/{op.unit_of_measure}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Summary Sidebar (on desktop) / Bottom on mobile */}
      <div className="lg:fixed lg:right-8 lg:top-1/2 lg:-translate-y-1/2 lg:w-64">
        <div className="bg-card border rounded-xl p-5 space-y-4 shadow-lg">
          <h3 className="font-semibold text-foreground">Resumen</h3>
          
          <div className="space-y-3 text-sm">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const value = categoryTotals[key] || 0;
              if (value === 0) return null;
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">SUBTOTAL</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64" />

      {/* Actions */}
      <OTFormActions
        showPrev
        showNext
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Siguiente"
      />
    </div>
  );
}
