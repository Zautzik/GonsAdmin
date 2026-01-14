import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, Bell } from "lucide-react";
import { createProductionIssue } from "@/hooks/useProductionTracking";

interface IssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ot: any;
  onSuccess: () => void;
}

const issueTypes = [
  { value: "machine_breakdown", label: "Falla de Máquina", icon: "🔧" },
  { value: "material_defect", label: "Defecto de Material", icon: "📦" },
  { value: "quality_issue", label: "Problema de Calidad", icon: "⚠️" },
  { value: "shortage", label: "Falta de Material", icon: "📋" },
  { value: "other", label: "Otro", icon: "❓" },
];

const severityLevels = [
  { value: "low", label: "Bajo", color: "text-green-600", bgColor: "bg-green-100" },
  { value: "medium", label: "Medio", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  { value: "high", label: "Alto", color: "text-orange-600", bgColor: "bg-orange-100" },
  { value: "critical", label: "Crítico", color: "text-red-600", bgColor: "bg-red-100" },
];

export default function IssueReportDialog({
  open,
  onOpenChange,
  ot,
  onSuccess,
}: IssueReportDialogProps) {
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [notifySupervisor, setNotifySupervisor] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!issueType || !description.trim()) {
      return;
    }

    setLoading(true);
    const result = await createProductionIssue({
      work_order_id: ot?.workOrder?.id || ot?.id,
      issue_type: issueType as "machine_breakdown" | "material_defect" | "quality_issue" | "shortage" | "other",
      severity,
      description: description.trim(),
    });

    if (result) {
      onSuccess();
      onOpenChange(false);
      // Reset form
      setIssueType("");
      setSeverity("medium");
      setDescription("");
      setNotifySupervisor(true);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reportar Problema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* OT Info */}
          {ot && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="font-semibold">{ot?.ot_number}</p>
              <p className="text-sm text-muted-foreground">{ot?.client_name}</p>
            </div>
          )}

          {/* Issue Type */}
          <div className="space-y-2">
            <Label>Tipo de Problema</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severidad</Label>
            <div className="grid grid-cols-4 gap-2">
              {severityLevels.map((level) => (
                <Button
                  key={level.value}
                  type="button"
                  variant={severity === level.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeverity(level.value)}
                  className={severity === level.value ? "" : `${level.bgColor} ${level.color} border-0`}
                >
                  {level.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción del Problema</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema con detalle..."
              rows={4}
            />
          </div>

          {/* Notify Supervisor */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-supervisor"
              checked={notifySupervisor}
              onCheckedChange={(checked) => setNotifySupervisor(checked === true)}
            />
            <label
              htmlFor="notify-supervisor"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Bell className="h-4 w-4 text-primary" />
              Notificar al supervisor
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !issueType || !description.trim()}
            variant="destructive"
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reportar Problema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
