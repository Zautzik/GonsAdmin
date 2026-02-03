import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTFormStore } from '@/stores/otFormStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, FileCheck, Loader2, Calculator, BadgePercent } from 'lucide-react';

interface Step5Props {
  onPrev: () => void;
}

export default function Step5Pricing({ onPrev }: Step5Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    jobInfo, specifications, calculations, operations, pricing, 
    setPricing, calculatePricing, resetForm, setLastSaved 
  } = useOTFormStore();
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    calculatePricing();
  }, [operations]);

  const handlePercentChange = (field: keyof typeof pricing, value: number) => {
    setPricing({ [field]: value });
    setTimeout(() => calculatePricing(), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  const saveWorkOrder = async (status: 'draft' | 'approved') => {
    const isSaving = status === 'draft';
    if (isSaving) setSaving(true);
    else setApproving(true);

    try {
      // Build specifications JSONB
      const specsJson = {
        dimensions: { width_cm: specifications.finishedWidthCm, height_cm: specifications.finishedHeightCm },
        substrate: { type: specifications.substrateType, weight_gsm: specifications.substrateWeightGsm, brand: specifications.substrateBrand },
        colors: { front: specifications.colorsFront, back: specifications.colorsBack, pantones: specifications.pantoneColors },
        finishing: specifications.finishingOperations,
      };

      // Build calculations JSONB
      const calcsJson = {
        sheet_format: calculations.sheetFormat,
        bocas_per_sheet: calculations.bocasPerSheet,
        total_sheets: calculations.totalSheets,
        substrate_kg: calculations.substrateKg,
        ink_kg: 0,
        ctp_plates: calculations.ctpPlates,
      };

      // Create work order with consolidated schema
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .insert([{
          client_name: jobInfo.clientName,
          client_id: jobInfo.clientId || null,
          product_name: jobInfo.productName,
          product_description: jobInfo.productDescription,
          quantity: jobInfo.quantity,
          delivery_date: jobInfo.deliveryDate || null,
          priority: String(jobInfo.priority || 'normal'),
          notes: jobInfo.notes,
          status,
          specifications: specsJson,
          calculations: calcsJson,
          unit_price: pricing.unitPrice,
          total_price: pricing.totalPrice,
          cost_budgeted: pricing.subtotal,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (woError) throw woError;

      // Save operations to operations table
      if (operations.length > 0) {
        await supabase.from('operations').insert(
          operations.map((op, index) => ({
            work_order_id: workOrder.id,
            operation_code: op.operationCode,
            operation_name: op.operationCode,
            category: 'OTHER',
            sequence_order: index,
            quantity_budgeted: op.quantityBudgeted,
            unit_cost_budgeted: op.unitCostBudgeted,
            total_cost_budgeted: op.totalCostBudgeted,
            unit_of_measure: op.unitOfMeasure || 'units',
            notes: op.notes,
            status: 'pending',
          }))
        );
      }

      setLastSaved(new Date());
      toast({ 
        title: status === 'approved' ? 'OT Aprobada' : 'Borrador guardado', 
        description: `OT #${workOrder.ot_number} ${status === 'approved' ? 'aprobada y lista para producción' : 'guardada correctamente'}` 
      });
      resetForm();
      navigate('/ots/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setApproving(false);
    }
  };

  const costBreakdown = [
    { label: 'Materiales', value: pricing.materialsCost, percent: pricing.subtotal > 0 ? (pricing.materialsCost / pricing.subtotal * 100).toFixed(1) : '0' },
    { label: 'Mano de Obra', value: pricing.laborCost, percent: pricing.subtotal > 0 ? (pricing.laborCost / pricing.subtotal * 100).toFixed(1) : '0' },
    { label: 'Terceros', value: pricing.thirdPartyCost, percent: pricing.subtotal > 0 ? (pricing.thirdPartyCost / pricing.subtotal * 100).toFixed(1) : '0' },
    { label: 'Otros', value: pricing.otherCost, percent: pricing.subtotal > 0 ? (pricing.otherCost / pricing.subtotal * 100).toFixed(1) : '0' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Desglose de Costos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.percent}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Subtotal</TableCell>
                  <TableCell className="text-right">{formatCurrency(pricing.subtotal)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgePercent className="h-5 w-5" />
              Calculadora de Precio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Utilidad %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.marginPercent}
                  onChange={(e) => handlePercentChange('marginPercent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">+ {formatCurrency(pricing.marginAmount)}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Incremento %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.incrementPercent}
                  onChange={(e) => handlePercentChange('incrementPercent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">+ {formatCurrency(pricing.incrementAmount)}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Comisión %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.commission1Percent}
                  onChange={(e) => handlePercentChange('commission1Percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">+ {formatCurrency(pricing.commission1Amount)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cantidad</p>
              <p className="text-2xl font-bold">{jobInfo.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Precio Unitario</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(pricing.unitPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(pricing.totalPrice)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => saveWorkOrder('draft')} disabled={saving || approving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Borrador
          </Button>
          <Button onClick={() => saveWorkOrder('approved')} disabled={saving || approving} className="gap-2">
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            Aprobar OT
          </Button>
        </div>
      </div>
    </div>
  );
}