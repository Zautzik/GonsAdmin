import { useEffect } from 'react';
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
import { ArrowLeft, DollarSign, Save, FileCheck, Loader2, TrendingUp, Calculator, BadgePercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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
      // Create work order
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .insert({
          client_name: jobInfo.clientName,
          client_id: jobInfo.clientId || null,
          product_name: jobInfo.productName,
          product_description: jobInfo.productDescription,
          quantity: jobInfo.quantity,
          delivery_date: jobInfo.deliveryDate || null,
          budget_code: jobInfo.budgetCode,
          priority: jobInfo.priority,
          notes: jobInfo.notes,
          status,
          unit_price: pricing.unitPrice,
          total_price: pricing.totalPrice,
          created_by: user?.id,
        })
        .select()
        .single();

      if (woError) throw woError;

      // Save specifications
      await supabase.from('ot_specifications').insert({
        work_order_id: workOrder.id,
        product_type: specifications.productType,
        finished_width_cm: specifications.finishedWidthCm,
        finished_height_cm: specifications.finishedHeightCm,
        substrate_type: specifications.substrateType,
        substrate_weight_gsm: specifications.substrateWeightGsm,
        substrate_brand: specifications.substrateBrand,
        colors_front: specifications.colorsFront,
        colors_back: specifications.colorsBack,
        pantone_colors: specifications.pantoneColors,
        finishing_operations: specifications.finishingOperations,
        packaging_notes: specifications.packagingNotes,
      });

      // Save calculations
      await supabase.from('ot_calculations').insert({
        work_order_id: workOrder.id,
        sheet_format: calculations.sheetFormat,
        sheet_width_cm: calculations.sheetWidthCm,
        sheet_height_cm: calculations.sheetHeightCm,
        bocas_per_sheet: calculations.bocasPerSheet,
        total_sheets: calculations.totalSheets,
        setup_sheets: calculations.setupSheets,
        substrate_kg: calculations.substrateKg,
        waste_factor_percent: calculations.wasteFactorPercent,
        ctp_plates: calculations.ctpPlates,
        printing_hours_estimated: calculations.printingHoursEstimated,
      });

      // Save operations
      if (operations.length > 0) {
        await supabase.from('ot_operations').insert(
          operations.map(op => ({
            work_order_id: workOrder.id,
            operation_code: op.operationCode,
            sequence_order: op.sequenceOrder,
            quantity_budgeted: op.quantityBudgeted,
            unit_cost_budgeted: op.unitCostBudgeted,
            total_cost_budgeted: op.totalCostBudgeted,
            unit_of_measure: op.unitOfMeasure,
            notes: op.notes,
            status: 'pending' as const,
          }))
        );
      }

      // Save pricing
      await supabase.from('ot_pricing').insert({
        work_order_id: workOrder.id,
        materials_cost: pricing.materialsCost,
        labor_cost: pricing.laborCost,
        third_party_cost: pricing.thirdPartyCost,
        other_cost: pricing.otherCost,
        subtotal: pricing.subtotal,
        margin_percent: pricing.marginPercent,
        margin_amount: pricing.marginAmount,
        increment_percent: pricing.incrementPercent,
        increment_amount: pricing.incrementAmount,
        commission1_percent: pricing.commission1Percent,
        commission1_amount: pricing.commission1Amount,
        commission2_percent: pricing.commission2Percent,
        commission2_amount: pricing.commission2Amount,
        commission3_percent: pricing.commission3Percent,
        commission3_amount: pricing.commission3Amount,
        total_price: pricing.totalPrice,
        unit_price: pricing.unitPrice,
      });

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
        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Desglose de Costos
            </CardTitle>
            <CardDescription>Resumen por categoría</CardDescription>
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

        {/* Pricing Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgePercent className="h-5 w-5" />
              Calculadora de Precio
            </CardTitle>
            <CardDescription>Márgenes y comisiones</CardDescription>
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
              <div className="col-span-2 text-right font-medium">
                + {formatCurrency(pricing.marginAmount)}
              </div>
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
              <div className="col-span-2 text-right font-medium">
                + {formatCurrency(pricing.incrementAmount)}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Comisión 1 %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.commission1Percent}
                  onChange={(e) => handlePercentChange('commission1Percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">
                + {formatCurrency(pricing.commission1Amount)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Comisión 2 %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.commission2Percent}
                  onChange={(e) => handlePercentChange('commission2Percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">
                + {formatCurrency(pricing.commission2Amount)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label>Comisión 3 %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pricing.commission3Percent}
                  onChange={(e) => handlePercentChange('commission3Percent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 text-right font-medium">
                + {formatCurrency(pricing.commission3Amount)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Price Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Cantidad</p>
              <p className="text-2xl font-bold">{jobInfo.quantity.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">unidades</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Precio Unitario</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(pricing.unitPrice)}</p>
              <p className="text-xs text-muted-foreground">por unidad</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(pricing.totalPrice)}</p>
              <p className="text-xs text-muted-foreground">IVA no incluido</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Margen Bruto</p>
            <p className="text-xl font-bold text-success">
              {pricing.subtotal > 0 ? ((pricing.totalPrice - pricing.subtotal) / pricing.totalPrice * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Costo/Unidad</p>
            <p className="text-xl font-bold">
              {formatCurrency(jobInfo.quantity > 0 ? pricing.subtotal / jobInfo.quantity : 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Ganancia/Unidad</p>
            <p className="text-xl font-bold text-success">
              {formatCurrency(pricing.unitPrice - (jobInfo.quantity > 0 ? pricing.subtotal / jobInfo.quantity : 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Ganancia Total</p>
            <p className="text-xl font-bold text-success">
              {formatCurrency(pricing.totalPrice - pricing.subtotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => saveWorkOrder('draft')} 
            disabled={saving || approving}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Borrador
          </Button>
          <Button 
            onClick={() => saveWorkOrder('approved')} 
            disabled={saving || approving}
            className="gap-2"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            Aprobar y Generar OT
          </Button>
        </div>
      </div>
    </div>
  );
}