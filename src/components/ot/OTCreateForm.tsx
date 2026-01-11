import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTFormStore } from '@/stores/otFormStore';
import { Skeleton } from '@/components/ui/skeleton';
import OTFormStepper from './OTFormStepper';
import Step1JobInfo from './steps/Step1JobInfo';
import Step2Specifications from './steps/Step2Specifications';
import Step3Calculations from './steps/Step3Calculations';
import Step4Operations from './steps/Step4Operations';
import Step5Pricing from './steps/Step5Pricing';

export default function OTCreateForm() {
  const { currentStep, setCurrentStep, resetForm, isDirty, lastSaved } = useOTFormStore();
  const navigate = useNavigate();

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && currentStep > 1) {
        // Could implement auto-save draft here
        console.log('Auto-save check at', new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1JobInfo onNext={() => setCurrentStep(2)} />;
      case 2:
        return <Step2Specifications onNext={() => setCurrentStep(3)} onPrev={() => setCurrentStep(1)} />;
      case 3:
        return <Step3Calculations onNext={() => setCurrentStep(4)} onPrev={() => setCurrentStep(2)} />;
      case 4:
        return <Step4Operations onNext={() => setCurrentStep(5)} onPrev={() => setCurrentStep(3)} />;
      case 5:
        return <Step5Pricing onPrev={() => setCurrentStep(4)} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nueva Orden de Trabajo</h1>
        <p className="text-muted-foreground">
          Complete los pasos para crear la OT
          {lastSaved && (
            <span className="ml-2 text-xs">
              • Guardado: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
      
      <OTFormStepper currentStep={currentStep} onStepClick={(step) => step <= currentStep && setCurrentStep(step)} />
      
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {renderStep()}
      </Suspense>
    </div>
  );
}
