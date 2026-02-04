import { useEffect, useMemo, useState } from 'react';
import { useOTFormStore } from '@/stores/otFormStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Droplets, Layers, ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import OTFormActions from '../OTFormActions';

const SHEET_FORMATS = [
  { name: '35x50', width: 35, height: 50 },
  { name: '50x70', width: 50, height: 70 },
  { name: '72x102', width: 72, height: 102 },
];

interface Step3Props {
  onNext: () => void;
  onPrev: () => void;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}

function SummaryCard({ icon, label, value, unit, expandable, expanded, onToggle, children }: SummaryCardProps) {
  return (
    <div className="bg-muted/50 rounded-xl border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        disabled={!expandable}
        className={cn(
          'w-full p-5 text-left transition-colors',
          expandable && 'hover:bg-muted/80 cursor-pointer'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {expandable && (
            <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
          )}
        </div>
      </button>
      {expandable && expanded && children && (
        <div className="px-5 pb-5 pt-0 border-t bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Step3Calculations({ onNext, onPrev }: Step3Props) {
  const { jobInfo, specifications, calculations, setCalculations } = useOTFormStore();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
      
      // Calculate ink (simplified: 2g per m² per color)
      const printArea = totalSheets * sheetAreaM2;
      const inkKg = (printArea * totalColors * 2) / 1000;
      
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
        inkCalculations: { totalKg: Math.round(inkKg * 100) / 100, perColor: {} },
        impositionLayout: { ...bestFormat.layout, efficiency: parseFloat(bestFormat.efficiency) },
        printingHoursEstimated: Math.round(printingHours * 100) / 100,
      });
    }
  }, [bestFormat, jobInfo.quantity, specifications, calculations.wasteFactorPercent, calculations.setupSheets, setCalculations]);

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sheets Card */}
        <SummaryCard
          icon={<FileText className="h-5 w-5" />}
          label="Pliegos"
          value={calculations.totalSheets || 0}
          expandable
          expanded={expandedCard === 'sheets'}
          onToggle={() => toggleCard('sheets')}
        >
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Formato Seleccionado</Label>
              <div className="flex gap-2">
                {formatAnalysis.map((format, index) => (
                  <button
                    key={format.name}
                    type="button"
                    onClick={() => setCalculations({ 
                      sheetFormat: format.name, 
                      sheetWidthCm: format.width, 
                      sheetHeightCm: format.height, 
                      bocasPerSheet: format.bocas 
                    })}
                    className={cn(
                      'flex-1 p-2 rounded-lg border text-xs transition-colors',
                      calculations.sheetFormat === format.name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    <div className="font-medium">{format.name}</div>
                    <div className="text-[10px] opacity-80">{format.bocas} bocas</div>
                    {index === 0 && <Badge variant="outline" className="mt-1 text-[8px] px-1">Óptimo</Badge>}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Setup</Label>
                <Input
                  type="number"
                  value={calculations.setupSheets}
                  onChange={(e) => setCalculations({ setupSheets: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desperdicio %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={calculations.wasteFactorPercent}
                  onChange={(e) => setCalculations({ wasteFactorPercent: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Layout: {calculations.impositionLayout?.cols}×{calculations.impositionLayout?.rows} • 
              Eficiencia: {calculations.impositionLayout?.efficiency?.toFixed(1)}%
            </div>
          </div>
        </SummaryCard>

        {/* Substrate Card */}
        <SummaryCard
          icon={<Layers className="h-5 w-5" />}
          label="Sustrato"
          value={calculations.substrateKg || 0}
          unit="kg"
          expandable
          expanded={expandedCard === 'substrate'}
          onToggle={() => toggleCard('substrate')}
        >
          <div className="space-y-2 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span>{specifications.substrateType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gramaje:</span>
              <span>{specifications.substrateWeightGsm} g/m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formato:</span>
              <span>{calculations.sheetFormat} cm</span>
            </div>
          </div>
        </SummaryCard>

        {/* Ink Card */}
        <SummaryCard
          icon={<Droplets className="h-5 w-5" />}
          label="Tintas"
          value={calculations.inkCalculations?.totalKg || 0}
          unit="kg"
          expandable
          expanded={expandedCard === 'ink'}
          onToggle={() => toggleCard('ink')}
        >
          <div className="space-y-2 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiro:</span>
              <span>{specifications.colorsFront} colores</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retiro:</span>
              <span>{specifications.colorsBack} colores</span>
            </div>
            {specifications.pantoneColors?.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pantone:</span>
                <span>{specifications.pantoneColors.length} colores</span>
              </div>
            )}
          </div>
        </SummaryCard>

        {/* CTP Plates Card */}
        <SummaryCard
          icon={<Settings2 className="h-5 w-5" />}
          label="Placas CTP"
          value={calculations.ctpPlates || 0}
          unit="placas"
          expandable
          expanded={expandedCard === 'ctp'}
          onToggle={() => toggleCard('ctp')}
        >
          <div className="space-y-2 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CMYK Tiro:</span>
              <span>{specifications.colorsFront}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CMYK Retiro:</span>
              <span>{specifications.colorsBack}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Especiales:</span>
              <span>{specifications.pantoneColors?.length || 0}</span>
            </div>
          </div>
        </SummaryCard>
      </div>

      {/* Time Estimate */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <span>Tiempos estimados</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="bg-muted/50 rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impresión:</span>
              <span className="font-medium">{calculations.printingHoursEstimated?.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terminaciones:</span>
              <span className="font-medium">{(calculations.finishingHoursEstimated || 0).toFixed(1)} hrs</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sticky Bottom Actions */}
      <OTFormActions onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
