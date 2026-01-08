import { useEffect, useMemo } from 'react';
import { useOTFormStore } from '@/stores/otFormStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ArrowRight, ChevronDown, Calculator, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHEET_FORMATS = [
  { name: '35x50', width: 35, height: 50 },
  { name: '50x70', width: 50, height: 70 },
  { name: '72x102', width: 72, height: 102 },
];

interface Step3Props {
  onNext: () => void;
  onPrev: () => void;
}

export default function Step3Calculations({ onNext, onPrev }: Step3Props) {
  const { jobInfo, specifications, calculations, setCalculations } = useOTFormStore();

  const formatAnalysis = useMemo(() => {
    return SHEET_FORMATS.map((format) => {
      const cols = Math.floor(format.width / specifications.finishedWidthCm);
      const rows = Math.floor(format.height / specifications.finishedHeightCm);
      const bocas = cols * rows;
      
      const colsAlt = Math.floor(format.width / specifications.finishedHeightCm);
      const rowsAlt = Math.floor(format.height / specifications.finishedWidthCm);
      const bocasAlt = colsAlt * rowsAlt;
      
      const bestBocas = Math.max(bocas, bocasAlt);
      const usedArea = bestBocas * specifications.finishedWidthCm * specifications.finishedHeightCm;
      const totalArea = format.width * format.height;
      const efficiency = (usedArea / totalArea) * 100;
      
      return {
        ...format,
        bocas: bestBocas,
        efficiency: efficiency.toFixed(1),
        layout: bocas >= bocasAlt ? { rows, cols } : { rows: rowsAlt, cols: colsAlt },
        isRotated: bocasAlt > bocas,
      };
    }).sort((a, b) => b.bocas - a.bocas);
  }, [specifications.finishedWidthCm, specifications.finishedHeightCm]);

  const bestFormat = formatAnalysis[0];

  useEffect(() => {
    if (bestFormat && bestFormat.bocas > 0) {
      const wastePercent = calculations.wasteFactorPercent || 5;
      const setupSheets = calculations.setupSheets || 500;
      const sheetsNeeded = Math.ceil(jobInfo.quantity / bestFormat.bocas);
      const totalSheets = Math.ceil(sheetsNeeded * (1 + wastePercent / 100)) + setupSheets;
      
      // Calculate substrate weight
      const sheetAreaM2 = (bestFormat.width / 100) * (bestFormat.height / 100);
      const substrateKg = totalSheets * sheetAreaM2 * (specifications.substrateWeightGsm / 1000);
      
      // Calculate CTP plates
      const totalColors = specifications.colorsFront + specifications.colorsBack;
      const ctpPlates = totalColors + (specifications.pantoneColors?.length || 0);
      
      // Estimate printing hours (simplified: 3000 sheets/hour average)
      const printingHours = totalSheets / 3000;
      
      setCalculations({
        sheetFormat: bestFormat.name,
        sheetWidthCm: bestFormat.width,
        sheetHeightCm: bestFormat.height,
        bocasPerSheet: bestFormat.bocas,
        totalSheets,
        setupSheets,
        substrateKg: Math.round(substrateKg * 100) / 100,
        wasteFactorPercent: wastePercent,
        ctpPlates,
        impositionLayout: { ...bestFormat.layout, efficiency: parseFloat(bestFormat.efficiency) },
        printingHoursEstimated: Math.round(printingHours * 100) / 100,
      });
    }
  }, [bestFormat, jobInfo.quantity, specifications, calculations.wasteFactorPercent, calculations.setupSheets]);

  return (
    <div className="space-y-6">
      {/* Sheet Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Optimización de Pliego
          </CardTitle>
          <CardDescription>Análisis automático de formatos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formatAnalysis.map((format, index) => (
              <div
                key={format.name}
                className={cn(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all',
                  calculations.sheetFormat === format.name
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50',
                  index === 0 && 'ring-2 ring-success/50'
                )}
                onClick={() => setCalculations({ sheetFormat: format.name, sheetWidthCm: format.width, sheetHeightCm: format.height, bocasPerSheet: format.bocas })}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{format.name} cm</span>
                  {index === 0 && <Badge className="bg-success text-success-foreground">Recomendado</Badge>}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bocas:</span>
                    <span className="font-medium">{format.bocas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eficiencia:</span>
                    <span className="font-medium">{format.efficiency}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Layout:</span>
                    <span className="font-medium">{format.layout.cols}×{format.layout.rows}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculated Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cálculo de Sustrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pliegos Setup</Label>
                <Input
                  type="number"
                  value={calculations.setupSheets}
                  onChange={(e) => setCalculations({ setupSheets: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Desperdicio %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={calculations.wasteFactorPercent}
                  onChange={(e) => setCalculations({ wasteFactorPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Pliegos:</span>
                <span className="font-bold">{calculations.totalSheets?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Peso Sustrato:</span>
                <span className="font-bold">{calculations.substrateKg} kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cálculo de Impresión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Planchas CTP:</span>
                <span className="font-bold">{calculations.ctpPlates}</span>
              </div>
              <div className="flex justify-between">
                <span>Horas Impresión (est.):</span>
                <span className="font-bold">{calculations.printingHoursEstimated} hrs</span>
              </div>
              <div className="flex justify-between">
                <span>Colores:</span>
                <span className="font-bold">{specifications.colorsFront}/{specifications.colorsBack}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button onClick={onNext} className="gap-2">
          Siguiente <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
