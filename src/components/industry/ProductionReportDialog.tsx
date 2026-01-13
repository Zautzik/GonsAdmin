import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, Clock, Minus, Plus, AlertTriangle } from "lucide-react";
import { createProductionReport } from "@/hooks/useProductionTracking";

interface ProductionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ot: any;
  onSuccess: () => void;
}

export default function ProductionReportDialog({
  open,
  onOpenChange,
  ot,
  onSuccess,
}: ProductionReportDialogProps) {
  const [unitsProduced, setUnitsProduced] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [unitsRejected, setUnitsRejected] = useState(0);
  const [notes, setNotes] = useState("");
  const [hasQualityIssue, setHasQualityIssue] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!ot?.workOrder?.id && !ot?.id) {
      return;
    }

    const timeMinutes = hours * 60 + minutes;
    if (unitsProduced <= 0 || timeMinutes <= 0) {
      return;
    }

    setLoading(true);
    const result = await createProductionReport({
      work_order_id: ot?.workOrder?.id || ot?.id,
      units_produced: unitsProduced,
      time_elapsed_minutes: timeMinutes,
      units_rejected: unitsRejected,
      notes: notes || undefined,
    });

    if (result) {
      onSuccess();
      onOpenChange(false);
      // Reset form
      setUnitsProduced(0);
      setHours(0);
      setMinutes(0);
      setUnitsRejected(0);
      setNotes("");
      setHasQualityIssue(false);
    }
    setLoading(false);
  };

  const adjustUnits = (delta: number) => {
    setUnitsProduced((prev) => Math.max(0, prev + delta));
  };

  const remaining = ot?.quantity ? ot.quantity - (ot.totalProduced || 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Reportar Progreso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* OT Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-semibold text-lg">{ot?.ot_number}</p>
            <p className="text-sm text-muted-foreground">{ot?.client_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Progreso: {ot?.totalProduced?.toLocaleString() || 0}/{ot?.quantity?.toLocaleString() || 0} 
              ({ot?.progressPercent || 0}%) — Restante: {remaining.toLocaleString()}
            </p>
          </div>

          {/* Units Produced */}
          <div className="space-y-2">
            <Label>Unidades Producidas</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustUnits(-100)}
                disabled={unitsProduced < 100}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={unitsProduced}
                onChange={(e) => setUnitsProduced(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center text-2xl font-bold h-14"
                min={0}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustUnits(100)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000].map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setUnitsProduced(val)}
                  className="flex-1"
                >
                  +{val}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Elapsed */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tiempo Transcurrido
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center"
                  min={0}
                  max={24}
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Horas</p>
              </div>
              <span className="text-xl font-bold">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="text-center"
                  min={0}
                  max={59}
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Minutos</p>
              </div>
            </div>
          </div>

          {/* Quality Issue Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="quality-issue"
              checked={hasQualityIssue}
              onCheckedChange={(checked) => setHasQualityIssue(checked === true)}
            />
            <label
              htmlFor="quality-issue"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-warning" />
              Reportar problema de calidad
            </label>
          </div>

          {hasQualityIssue && (
            <div className="space-y-2">
              <Label>Unidades Rechazadas</Label>
              <Input
                type="number"
                value={unitsRejected}
                onChange={(e) => setUnitsRejected(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || unitsProduced <= 0 || (hours === 0 && minutes === 0)}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
