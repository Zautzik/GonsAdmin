import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOTFormStore } from '@/stores/otFormStore';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import OTFormStepper from './OTFormStepper';
import Step1JobInfo from './steps/Step1JobInfo';
import Step2Specifications from './steps/Step2Specifications';
import Step3Calculations from './steps/Step3Calculations';
import { Save, FileCheck, Loader2 } from 'lucide-react';

export default function OTCreateForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStep, setCurrentStep, jobInfo, specifications, calculations, operations, pricing, resetForm, setLastSaved } = useOTFormStore();
  const [saving, setSaving] = useState(false);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
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
          status: 'draft',
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

      setLastSaved(new Date());
      toast({ title: 'Borrador guardado', description: `OT #${workOrder.ot_number} guardada correctamente` });
      resetForm();
      navigate('/ots/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1JobInfo onNext={() => setCurrentStep(2)} />;
      case 2:
        return <Step2Specifications onNext={() => setCurrentStep(3)} onPrev={() => setCurrentStep(1)} />;
      case 3:
        return <Step3Calculations onNext={() => setCurrentStep(4)} onPrev={() => setCurrentStep(2)} />;
      case 4:
        return (
          <Card>
            <CardHeader><CardTitle>Operaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Tabla de operaciones - próximamente</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>Anterior</Button>
                <Button onClick={() => setCurrentStep(5)}>Siguiente</Button>
              </div>
            </CardContent>
          </Card>
        );
      case 5:
        return (
          <Card>
            <CardHeader><CardTitle>Precio Final</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Calculadora de precios - próximamente</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(4)}>Anterior</Button>
                <Button onClick={handleSaveDraft} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Borrador
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nueva Orden de Trabajo</h1>
        <p className="text-muted-foreground">Complete los pasos para crear la OT</p>
      </div>
      
      <OTFormStepper currentStep={currentStep} onStepClick={(step) => step <= currentStep && setCurrentStep(step)} />
      
      {renderStep()}
    </div>
  );
}
