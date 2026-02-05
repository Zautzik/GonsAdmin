import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTFormStore } from '@/stores/otFormStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Save, FileCheck, Loader2, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step5Props {
  onPrev: () => void;
}

interface EditablePercentProps {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

function EditablePercent({ value, onChange, suffix = '%' }: EditablePercentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleSave = () => {
    onChange(parseFloat(tempValue) || 0);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <Input
          type="number"
          step="0.5"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="w-16 h-8 text-right text-sm"
          autoFocus
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <span className="text-muted-foreground">{suffix}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setTempValue(value.toString());
        setIsEditing(true);
      }}
      className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
    >
      {value}{suffix}
    </button>
  );
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
            operation_name: op.name,
            category: op.category,
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

  const pricingLines = [
    { 
      label: 'Subtotal (Costo Base)', 
      value: pricing.subtotal, 
      isBase: true 
    },
    { 
      label: 'Margen', 
      percentField: 'marginPercent' as const,
      percentValue: pricing.marginPercent,
      value: pricing.marginAmount, 
      isAddition: true 
    },
    { 
      label: 'Incremento', 
      percentField: 'incrementPercent' as const,
      percentValue: pricing.incrementPercent,
      value: pricing.incrementAmount, 
      isAddition: true 
    },
    { 
      label: 'Comisión', 
      percentField: 'commission1Percent' as const,
      percentValue: pricing.commission1Percent,
      value: pricing.commission1Amount, 
      isAddition: true 
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Pricing Calculator */}
      <div className="bg-card border rounded-2xl p-6 md:p-8 space-y-4">
        {pricingLines.map((line, index) => (
          <div
            key={line.label}
            className={cn(
              "flex items-center justify-between py-3",
              index !== pricingLines.length - 1 && "border-b border-border/50"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-foreground">{line.label}</span>
              {line.percentField && (
                <EditablePercent
                  value={line.percentValue!}
                  onChange={(v) => handlePercentChange(line.percentField!, v)}
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-right">
              {line.isAddition && <span className="text-muted-foreground">+</span>}
              <span className="font-semibold text-lg tabular-nums">
                {formatCurrency(line.value)}
              </span>
            </div>
          </div>
        ))}

        {/* Separator */}
        <div className="border-t-2 border-foreground/20 my-4" />

        {/* Total */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xl font-bold text-foreground">TOTAL</span>
          <span className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
            {formatCurrency(pricing.totalPrice)}
          </span>
        </div>

        {/* Unit Price */}
        <div className="flex items-center justify-between text-muted-foreground pt-2 border-t border-border/50">
          <span>Precio Unitario ({jobInfo.quantity.toLocaleString()} unidades)</span>
          <span className="font-semibold text-lg text-foreground tabular-nums">
            {formatCurrency(pricing.unitPrice)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Mobile: Stack buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Desktop layout */}
            <div className="flex-1 flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/ots/dashboard')}
                className="text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => saveWorkOrder('draft')}
                disabled={saving || approving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Borrador
              </Button>
            </div>
            
            <Button
              size="lg"
              onClick={() => saveWorkOrder('approved')}
              disabled={saving || approving}
              className="gap-2 h-12 px-8 text-base font-semibold"
            >
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              Crear Orden de Trabajo
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="h-24" />
    </div>
  );
}
