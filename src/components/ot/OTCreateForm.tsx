import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTFormStore } from '@/stores/otFormStore';
import { Cloud } from 'lucide-react';
import OTFormStepper from './OTFormStepper';
import Step1JobInfo from './steps/Step1JobInfo';
import Step2Specifications from './steps/Step2Specifications';
import Step3Calculations from './steps/Step3Calculations';
import Step4Operations from './steps/Step4Operations';
import Step5Pricing from './steps/Step5Pricing';

export default function OTCreateForm() {
  const { currentStep, setCurrentStep, isDirty, lastSaved } = useOTFormStore();
  const navigate = useNavigate();

  // Auto-save indicator
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && currentStep > 1) {
        console.log('Auto-save check at', new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, currentStep]);

  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: 'Información del Trabajo',
          description: 'Ingrese los datos básicos del cliente y producto'
        };
      case 2:
        return {
          title: 'Especificaciones Técnicas',
          description: 'Define las dimensiones, materiales y acabados'
        };
      case 3:
        return {
          title: 'Cálculos y Optimización',
          description: 'Revisión automática de materiales y tiempos'
        };
      case 4:
        return {
          title: 'Operaciones',
          description: 'Detalle de costos por operación'
        };
      case 5:
        return {
          title: 'Precio Final',
          description: 'Márgenes, comisiones y cotización'
        };
      default:
        return { title: '', description: '' };
    }
  };

  const stepInfo = getStepInfo();

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

  // Hide the default step info for Step 5 which has its own layout
  const showStepInfo = currentStep !== 5;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Centered container */}
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Nueva Orden de Trabajo</h1>
          {lastSaved && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Cloud className="h-3 w-3" />
              <span>Guardado: {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        {/* Stepper */}
        <OTFormStepper 
          currentStep={currentStep} 
          onStepClick={(step) => step <= currentStep && setCurrentStep(step)} 
        />
        
        {/* Step Header */}
        {showStepInfo && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              {stepInfo.title}
            </h2>
            <p className="text-muted-foreground mt-1">
              {stepInfo.description}
            </p>
          </div>
        )}
        
        {/* Step Content */}
        {renderStep()}
      </div>
    </div>
  );
}
