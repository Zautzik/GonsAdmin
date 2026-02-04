import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  title: string;
}

const STEPS: Step[] = [
  { number: 1, title: 'Información' },
  { number: 2, title: 'Especificaciones' },
  { number: 3, title: 'Cálculos' },
  { number: 4, title: 'Operaciones' },
  { number: 5, title: 'Precio' },
];

interface OTFormStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function OTFormStepper({ currentStep, onStepClick }: OTFormStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex items-center justify-center">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;
          
          return (
            <li key={step.number} className="relative flex items-center">
              {/* Connecting line before (except first) */}
              {index !== 0 && (
                <div
                  className={cn(
                    'w-12 sm:w-16 md:w-20 h-0.5 -mr-0.5',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
              
              <button
                onClick={() => step.number <= currentStep && onStepClick?.(step.number)}
                disabled={step.number > currentStep}
                className={cn(
                  'relative flex flex-col items-center z-10',
                  step.number <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                )}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full font-medium transition-all',
                    isCurrent
                      ? 'h-10 w-10 bg-primary text-primary-foreground text-sm ring-4 ring-primary/20'
                      : isCompleted
                      ? 'h-8 w-8 bg-primary/80 text-primary-foreground text-xs'
                      : 'h-8 w-8 bg-muted border-2 border-muted-foreground/30 text-muted-foreground text-xs'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </span>
                
                {/* Step title */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium whitespace-nowrap',
                    isCurrent
                      ? 'text-foreground'
                      : isCompleted
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {step.title}
                </span>
              </button>
              
              {/* Connecting line after (except last) */}
              {index !== STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-12 sm:w-16 md:w-20 h-0.5 -ml-0.5',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
