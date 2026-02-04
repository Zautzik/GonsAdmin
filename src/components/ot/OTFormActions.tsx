import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Cloud } from 'lucide-react';
import { useOTFormStore } from '@/stores/otFormStore';

interface OTFormActionsProps {
  showPrev?: boolean;
  showNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  isNextDisabled?: boolean;
  nextLabel?: string;
  isSubmitting?: boolean;
}

export default function OTFormActions({
  showPrev = true,
  showNext = true,
  onPrev,
  onNext,
  onCancel,
  isNextDisabled = false,
  nextLabel = 'Siguiente',
  isSubmitting = false,
}: OTFormActionsProps) {
  const { isDirty, lastSaved } = useOTFormStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Back or Cancel */}
        <div>
          {showPrev && onPrev ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onPrev}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
          ) : onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          ) : (
            <div />
          )}
        </div>

        {/* Center: Auto-save indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          {isDirty ? (
            <>
              <Cloud className="h-3 w-3" />
              <span>Sin guardar</span>
            </>
          ) : lastSaved ? (
            <>
              <Cloud className="h-3 w-3 text-success" />
              <span>Guardado</span>
            </>
          ) : null}
        </div>

        {/* Right: Next button */}
        <div>
          {showNext && onNext && (
            <Button
              type="button"
              onClick={onNext}
              disabled={isNextDisabled || isSubmitting}
              className="gap-2 h-11 px-6"
              size="lg"
            >
              {isSubmitting ? 'Guardando...' : nextLabel}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
