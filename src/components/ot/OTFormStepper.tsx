import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { number: 1, title: 'Información', description: 'Datos del trabajo' },
  { number: 2, title: 'Especificaciones', description: 'Detalles técnicos' },
  { number: 3, title: 'Cálculos', description: 'Optimización' },
  { number: 4, title: 'Operaciones', description: 'Costos detallados' },
  { number: 5, title: 'Precio', description: 'Cotización final' },
];

interface OTFormStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function OTFormStepper({ currentStep, onStepClick }: OTFormStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <li key={step.number} className="relative flex-1">
            {index !== 0 && (
              <div
                className={cn(
                  'absolute left-0 top-4 -translate-x-1/2 w-full h-0.5',
                  step.number <= currentStep ? 'bg-primary' : 'bg-muted'
                )}
                style={{ left: '-50%', width: '100%' }}
              />
            )}
            <button
              onClick={() => onStepClick?.(step.number)}
              disabled={step.number > currentStep + 1}
              className={cn(
                'relative flex flex-col items-center group',
                step.number <= currentStep + 1 ? 'cursor-pointer' : 'cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors z-10',
                  step.number < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.number === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step.number < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </span>
              <span
                className={cn(
                  'mt-2 text-xs font-medium hidden sm:block',
                  step.number <= currentStep ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
              <span className="text-[10px] text-muted-foreground hidden md:block">
                {step.description}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
