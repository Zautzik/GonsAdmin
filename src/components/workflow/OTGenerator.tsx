import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator, FileText, Scissors, Printer, Package, DollarSign, Save, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Substrate {
  id: string;
  name: string;
  type: string;
  weight_grs: number;
  cost_per_kg: number;
  available_sizes: string[];
}

interface Ink {
  id: string;
  name: string;
  color: string;
  cost_per_liter: number;
  density_g_per_ml: number;
}

interface OTGeneratorProps {
  otId?: string;
  onSave?: () => void;
}

const PRODUCT_TYPES = [
  { value: 'volante', label: 'Volante / Flyer' },
  { value: 'carpeta', label: 'Carpeta / Folder' },
  { value: 'libro', label: 'Libro / Book' },
  { value: 'cupon', label: 'Cupón / Coupon' },
  { value: 'etiqueta', label: 'Etiqueta / Label' },
  { value: 'caja', label: 'Caja / Box' },
  { value: 'otro', label: 'Otro / Other' },
];

const FINISHING_OPTIONS = [
  { value: 'barniz_mate', label: 'Barniz Mate' },
  { value: 'barniz_brillante', label: 'Barniz Brillante' },
  { value: 'laminado', label: 'Laminado' },
  { value: 'corchetes', label: 'Corchetes / Stapling' },
  { value: 'doblado', label: 'Doblado / Folding' },
  { value: 'pegado', label: 'Pegado / Gluing' },
  { value: 'encuadernado', label: 'Encuadernado' },
];

export function OTGenerator({ otId, onSave }: OTGeneratorProps) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  
  const [substrates, setSubstrates] = useState<Substrate[]>([]);
  const [inks, setInks] = useState<Ink[]>([]);
  const [ots, setOts] = useState<any[]>([]);
  const [selectedOtId, setSelectedOtId] = useState(otId || '');
  const [loading, setLoading] = useState(false);
  
  const [specs, setSpecs] = useState({
    product_name: '',
    product_type: 'volante',
    final_width_cm: 9,
    final_height_cm: 6,
    closed_width_cm: 0,
    closed_height_cm: 0,
    pages_count: 1,
    substrate_type: 'couche_opaco',
    substrate_weight_grs: 300,
    sheet_width_cm: 72,
    sheet_height_cm: 102,
    sheets_needed: 0,
    sheets_per_base: 0,
    sheets_leftover: 0,
    substrate_cost_per_kg: 2200,
    substrate_kg_needed: 0,
    pliego_width_cm: 33,
    pliego_height_cm: 48,
    pliegos_to_print: 0,
    front_colors: 4,
    back_colors: 0,
    special_colors: [] as string[],
    printing_method: 'offset',
    ctp_plates_needed: 4,
    ink_coverage_percent: 30,
    ink_liters_needed: 0,
    initial_cuts: 0,
    final_cuts: 0,
    cut_cost_per_unit: 110,
    requires_die_cutting: false,
    die_mold_exists: false,
    die_mold_cost: 0,
    die_cutting_hours: 0,
    die_boca_count: 1,
    finishing_processes: [] as string[],
    packaging_boxes: 0,
    units_per_box: 500,
    prepress_hours: 1,
    printing_hours: 0,
    finishing_hours: 0,
    layout_rows: 5,
    layout_cols: 4,
    production_notes: '',
  });
  
  const [costs, setCosts] = useState({
    substrate: 0,
    ink: 0,
    ctp: 0,
    printing: 0,
    cutting: 0,
    die_cutting: 0,
    finishing: 0,
    packaging: 0,
    labor: 0,
    outsourcing: 0,
    total: 0,
    margin_percent: 10,
    final_price: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateCosts();
  }, [specs]);

  const fetchData = async () => {
    const [substratesRes, inksRes, otsRes] = await Promise.all([
      supabase.from('substrates').select('*'),
      supabase.from('inks').select('*'),
      supabase.from('ots').select('*').order('created_at', { ascending: false }),
    ]);
    
    if (substratesRes.data) setSubstrates(substratesRes.data);
    if (inksRes.data) setInks(inksRes.data);
    if (otsRes.data) setOts(otsRes.data);
  };

  const calculateCosts = () => {
    const bocas = specs.layout_rows * specs.layout_cols;
    const selectedOT = ots.find(o => o.id === selectedOtId);
    const quantity = selectedOT?.quantity || 1000;
    
    // Sheets calculation
    const sheetsNeeded = Math.ceil(quantity / bocas);
    const pliegosNeeded = Math.ceil(sheetsNeeded * 1.05); // 5% waste
    
    // Substrate cost (kg)
    const sheetAreaSqm = (specs.sheet_width_cm * specs.sheet_height_cm) / 10000;
    const kgNeeded = (sheetsNeeded * sheetAreaSqm * specs.substrate_weight_grs) / 1000;
    const substrateCost = kgNeeded * specs.substrate_cost_per_kg;
    
    // Ink cost
    const printAreaSqm = (specs.pliego_width_cm * specs.pliego_height_cm) / 10000;
    const totalPrintArea = printAreaSqm * pliegosNeeded * (specs.front_colors + specs.back_colors);
    const inkGrams = totalPrintArea * 2.5 * (specs.ink_coverage_percent / 100); // ~2.5g/sqm average
    const inkLiters = inkGrams / 1050; // avg density
    const inkCost = inkLiters * 42000; // avg cost per liter
    
    // CTP cost
    const ctpCost = specs.ctp_plates_needed * 7000;
    
    // Cutting costs
    const cuttingCost = (specs.initial_cuts + specs.final_cuts) * specs.cut_cost_per_unit;
    
    // Die cutting
    const dieCuttingCost = specs.requires_die_cutting 
      ? (specs.die_mold_exists ? 0 : specs.die_mold_cost) + (specs.die_cutting_hours * 12500)
      : 0;
    
    // Printing labor (offset ~$78,000/hr)
    const printingCost = specs.printing_hours * 78000;
    
    // Packaging
    const boxesNeeded = Math.ceil(quantity / specs.units_per_box);
    const packagingCost = boxesNeeded * 200;
    
    // Calculate totals
    const subtotal = substrateCost + inkCost + ctpCost + printingCost + cuttingCost + dieCuttingCost + packagingCost;
    const finalPrice = subtotal * (1 + costs.margin_percent / 100);
    
    setCosts({
      ...costs,
      substrate: Math.round(substrateCost),
      ink: Math.round(inkCost),
      ctp: ctpCost,
      printing: printingCost,
      cutting: cuttingCost,
      die_cutting: dieCuttingCost,
      packaging: packagingCost,
      total: Math.round(subtotal),
      final_price: Math.round(finalPrice),
    });
    
    setSpecs(prev => ({
      ...prev,
      sheets_needed: sheetsNeeded,
      pliegos_to_print: pliegosNeeded,
      substrate_kg_needed: Math.round(kgNeeded * 100) / 100,
      ink_liters_needed: Math.round(inkLiters * 1000) / 1000,
      packaging_boxes: boxesNeeded,
    }));
  };

  const handleSave = async () => {
    if (!selectedOtId) {
      toast.error('Please select an OT');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('ot_specifications').upsert({
      ot_id: selectedOtId,
      ...specs,
    }, { onConflict: 'ot_id' });
    
    setLoading(false);
    
    if (error) {
      toast.error('Error saving specifications');
      return;
    }
    
    toast.success('Specifications saved!');
    onSave?.();
  };

  const selectedOT = ots.find(o => o.id === selectedOtId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{isSpanish ? 'Generador de OT' : 'OT Generator'}</h2>
          <p className="text-muted-foreground">{isSpanish ? 'Especificaciones técnicas y cálculo de costos' : 'Technical specifications & cost calculation'}</p>
        </div>
        <Button onClick={handleSave} disabled={loading || !selectedOtId} className="bg-primary">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Specs'}
        </Button>
      </div>

      {/* OT Selection */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {isSpanish ? 'Seleccionar OT' : 'Select OT'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOtId} onValueChange={setSelectedOtId}>
            <SelectTrigger>
              <SelectValue placeholder={isSpanish ? 'Seleccione una OT...' : 'Select an OT...'} />
            </SelectTrigger>
            <SelectContent>
              {ots.map(ot => (
                <SelectItem key={ot.id} value={ot.id}>
                  {ot.ot_number} - {ot.client_name} ({ot.quantity} unidades)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOT && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{selectedOT.client_name}</strong></div>
                <div><span className="text-muted-foreground">Cantidad:</span> <strong>{selectedOT.quantity?.toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Deadline:</span> <strong>{selectedOT.deadline ? new Date(selectedOT.deadline).toLocaleDateString() : 'N/A'}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="product" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="product"><Package className="w-4 h-4 mr-1" /> Producto</TabsTrigger>
          <TabsTrigger value="substrate"><FileText className="w-4 h-4 mr-1" /> Sustrato</TabsTrigger>
          <TabsTrigger value="printing"><Printer className="w-4 h-4 mr-1" /> Impresión</TabsTrigger>
          <TabsTrigger value="finishing"><Scissors className="w-4 h-4 mr-1" /> Terminado</TabsTrigger>
          <TabsTrigger value="costs"><DollarSign className="w-4 h-4 mr-1" /> Costos</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-3 gap-4">
              <div>
                <Label>Nombre del Producto</Label>
                <Input value={specs.product_name} onChange={e => setSpecs({...specs, product_name: e.target.value})} placeholder="Volantes Gatorade..." />
              </div>
              <div>
                <Label>Tipo de Producto</Label>
                <Select value={specs.product_type} onValueChange={v => setSpecs({...specs, product_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Páginas</Label>
                <Input type="number" value={specs.pages_count} onChange={e => setSpecs({...specs, pages_count: parseInt(e.target.value) || 1})} />
              </div>
              <div>
                <Label>Ancho Final (cm)</Label>
                <Input type="number" step="0.1" value={specs.final_width_cm} onChange={e => setSpecs({...specs, final_width_cm: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Alto Final (cm)</Label>
                <Input type="number" step="0.1" value={specs.final_height_cm} onChange={e => setSpecs({...specs, final_height_cm: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Layout (Bocas)</Label>
                <div className="flex gap-2">
                  <Input type="number" value={specs.layout_rows} onChange={e => setSpecs({...specs, layout_rows: parseInt(e.target.value) || 1})} className="w-16" />
                  <span className="flex items-center">x</span>
                  <Input type="number" value={specs.layout_cols} onChange={e => setSpecs({...specs, layout_cols: parseInt(e.target.value) || 1})} className="w-16" />
                  <Badge variant="secondary" className="ml-2">= {specs.layout_rows * specs.layout_cols} bocas</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substrate" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Sustrato</Label>
                <Select value={specs.substrate_type} onValueChange={v => {
                  const sub = substrates.find(s => s.type === v);
                  setSpecs({...specs, substrate_type: v, substrate_cost_per_kg: sub?.cost_per_kg || specs.substrate_cost_per_kg});
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {substrates.map(s => <SelectItem key={s.id} value={s.type}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gramaje (grs)</Label>
                <Input type="number" value={specs.substrate_weight_grs} onChange={e => setSpecs({...specs, substrate_weight_grs: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Costo por Kg ($)</Label>
                <Input type="number" value={specs.substrate_cost_per_kg} onChange={e => setSpecs({...specs, substrate_cost_per_kg: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Hoja Ancho (cm)</Label>
                <Input type="number" value={specs.sheet_width_cm} onChange={e => setSpecs({...specs, sheet_width_cm: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Hoja Alto (cm)</Label>
                <Input type="number" value={specs.sheet_height_cm} onChange={e => setSpecs({...specs, sheet_height_cm: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Pliego (cm)</Label>
                <div className="flex gap-2">
                  <Input type="number" value={specs.pliego_width_cm} onChange={e => setSpecs({...specs, pliego_width_cm: parseFloat(e.target.value) || 0})} />
                  <span className="flex items-center">x</span>
                  <Input type="number" value={specs.pliego_height_cm} onChange={e => setSpecs({...specs, pliego_height_cm: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-info/10 border-info/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-info">{specs.sheets_needed.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Hojas Necesarias</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">{specs.pliegos_to_print.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pliegos a Imprimir</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">{specs.substrate_kg_needed} kg</p>
                  <p className="text-sm text-muted-foreground">Sustrato Requerido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-3 gap-4">
              <div>
                <Label>Método de Impresión</Label>
                <Select value={specs.printing_method} onValueChange={v => setSpecs({...specs, printing_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offset">Offset</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="mixed">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colores Frente</Label>
                <Input type="number" max={6} value={specs.front_colors} onChange={e => setSpecs({...specs, front_colors: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Colores Retiro</Label>
                <Input type="number" max={6} value={specs.back_colors} onChange={e => setSpecs({...specs, back_colors: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Planchas CTP</Label>
                <Input type="number" value={specs.ctp_plates_needed} onChange={e => setSpecs({...specs, ctp_plates_needed: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Cobertura Tinta (%)</Label>
                <Input type="number" value={specs.ink_coverage_percent} onChange={e => setSpecs({...specs, ink_coverage_percent: parseFloat(e.target.value) || 30})} />
              </div>
              <div>
                <Label>Horas Impresión</Label>
                <Input type="number" step="0.5" value={specs.printing_hours} onChange={e => setSpecs({...specs, printing_hours: parseFloat(e.target.value) || 0})} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-500">{specs.ink_liters_needed} L</p>
                  <p className="text-sm text-muted-foreground">Tinta Estimada</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-500">{specs.front_colors}/{specs.back_colors}</p>
                  <p className="text-sm text-muted-foreground">Colores F/R</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finishing" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label>Cortes</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Corte Inicial</Label>
                    <Input type="number" value={specs.initial_cuts} onChange={e => setSpecs({...specs, initial_cuts: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Corte Final</Label>
                    <Input type="number" value={specs.final_cuts} onChange={e => setSpecs({...specs, final_cuts: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <Checkbox checked={specs.requires_die_cutting} onCheckedChange={c => setSpecs({...specs, requires_die_cutting: !!c})} />
                  <Label>Requiere Troquelado</Label>
                </div>
                {specs.requires_die_cutting && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={specs.die_mold_exists} onCheckedChange={c => setSpecs({...specs, die_mold_exists: !!c})} />
                      <Label className="text-sm">Molde Existente</Label>
                    </div>
                    {!specs.die_mold_exists && (
                      <div>
                        <Label className="text-sm">Costo Molde ($)</Label>
                        <Input type="number" value={specs.die_mold_cost} onChange={e => setSpecs({...specs, die_mold_cost: parseFloat(e.target.value) || 0})} />
                      </div>
                    )}
                    <div>
                      <Label className="text-sm">Horas Troquelado</Label>
                      <Input type="number" step="0.5" value={specs.die_cutting_hours} onChange={e => setSpecs({...specs, die_cutting_hours: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Procesos de Terminado</Label>
                <div className="space-y-2">
                  {FINISHING_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox 
                        checked={specs.finishing_processes.includes(opt.value)}
                        onCheckedChange={c => {
                          const newProcesses = c 
                            ? [...specs.finishing_processes, opt.value]
                            : specs.finishing_processes.filter(p => p !== opt.value);
                          setSpecs({...specs, finishing_processes: newProcesses});
                        }}
                      />
                      <Label className="text-sm">{opt.label}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Unidades por Caja</Label>
                  <Input type="number" value={specs.units_per_box} onChange={e => setSpecs({...specs, units_per_box: parseInt(e.target.value) || 500})} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card className="border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Resumen de Costos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Sustrato</span>
                    <strong>${costs.substrate.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Tinta</span>
                    <strong>${costs.ink.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Planchas CTP</span>
                    <strong>${costs.ctp.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Impresión (Mano de Obra)</span>
                    <strong>${costs.printing.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Cortes Guillotina</span>
                    <strong>${costs.cutting.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Troquelado</span>
                    <strong>${costs.die_cutting.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Empaque ({specs.packaging_boxes} cajas)</span>
                    <strong>${costs.packaging.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Subtotal</span>
                  <strong className="text-destructive">${costs.total.toLocaleString()}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Margen de Utilidad (%)</span>
                  <Input 
                    type="number" 
                    className="w-24" 
                    value={costs.margin_percent} 
                    onChange={e => {
                      const margin = parseFloat(e.target.value) || 0;
                      setCosts({...costs, margin_percent: margin, final_price: Math.round(costs.total * (1 + margin / 100))});
                    }}
                  />
                </div>
                <div className="flex justify-between text-xl font-bold p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                  <span>Precio Final Sugerido</span>
                  <span className="text-primary">${costs.final_price.toLocaleString()}</span>
                </div>
                {selectedOT && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Precio Unitario</span>
                    <span>${(costs.final_price / selectedOT.quantity).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardContent className="pt-4">
              <Label>Notas de Producción</Label>
              <Textarea 
                value={specs.production_notes} 
                onChange={e => setSpecs({...specs, production_notes: e.target.value})}
                placeholder="Instrucciones especiales, observaciones..."
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
