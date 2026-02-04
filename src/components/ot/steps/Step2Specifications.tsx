import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOTFormStore, Specifications } from '@/stores/otFormStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, X, Ruler, Palette, FileText, Scissors } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import OTFormActions from '../OTFormActions';

const formSchema = z.object({
  productType: z.string().min(1, 'Seleccione tipo de producto'),
  finishedWidthCm: z.number().min(0.1, 'Ancho debe ser mayor a 0'),
  finishedHeightCm: z.number().min(0.1, 'Alto debe ser mayor a 0'),
  substrateType: z.string().min(1, 'Seleccione tipo de sustrato'),
  substrateWeightGsm: z.number().min(40, 'Gramaje mínimo 40 gsm'),
  substrateBrand: z.string().optional(),
  colorsFront: z.number().min(0).max(8),
  colorsBack: z.number().min(0).max(8),
  pantoneColors: z.array(z.string()),
  finishingOperations: z.array(z.string()),
  packagingNotes: z.string().optional(),
});

const PRODUCT_TYPES = [
  'Etiquetas', 'Cajas', 'Estuches', 'Folletos', 'Catálogos',
  'Afiches', 'Tarjetas', 'Sobres', 'Bolsas', 'Displays', 'Otro',
];

const SUBSTRATE_TYPES = [
  { value: 'Couche', label: 'Couche', desc: 'Brillante, común' },
  { value: 'Bond', label: 'Bond', desc: 'Papel de oficina' },
  { value: 'Kraft', label: 'Kraft', desc: 'Marrón, ecológico' },
  { value: 'Cartulina', label: 'Cartulina', desc: 'Rígida, tarjetas' },
  { value: 'Cartón', label: 'Cartón', desc: 'Cajas, empaques' },
  { value: 'Adhesivo', label: 'Adhesivo', desc: 'Etiquetas' },
];

const SUBSTRATE_WEIGHTS = [80, 90, 115, 130, 150, 170, 200, 250, 300, 350];

const COLOR_OPTIONS = [
  { value: 0, label: '0', desc: 'Sin impresión' },
  { value: 1, label: '1', desc: '1 color' },
  { value: 2, label: '2', desc: '2 colores' },
  { value: 3, label: '3', desc: '3 colores' },
  { value: 4, label: '4', desc: 'CMYK' },
  { value: 5, label: '5', desc: '5 colores' },
  { value: 6, label: '6', desc: '6 colores' },
];

const FINISHING_OPTIONS = [
  { id: 'die_cutting', label: 'Troquelado', icon: '✂️' },
  { id: 'folding', label: 'Plegado', icon: '📐' },
  { id: 'gluing', label: 'Pegado', icon: '🔗' },
  { id: 'lamination', label: 'Laminado', icon: '✨' },
  { id: 'varnish', label: 'Barniz', icon: '💧' },
  { id: 'embossing', label: 'Relieve', icon: '🎨' },
];

const MORE_FINISHING = [
  { id: 'perforation', label: 'Perforado' },
  { id: 'hot_stamping', label: 'Hot Stamping' },
  { id: 'uv_spot', label: 'UV Localizado' },
  { id: 'numbering', label: 'Numeración' },
];

interface Step2Props {
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2Specifications({ onNext, onPrev }: Step2Props) {
  const { specifications, setSpecifications } = useOTFormStore();
  const [newPantone, setNewPantone] = useState('');
  const [showMoreFinishing, setShowMoreFinishing] = useState(false);
  const [showSubstrateBrand, setShowSubstrateBrand] = useState(false);
  const [showPantones, setShowPantones] = useState(specifications.pantoneColors.length > 0);

  const form = useForm<Specifications>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productType: specifications.productType || '',
      finishedWidthCm: specifications.finishedWidthCm || 0,
      finishedHeightCm: specifications.finishedHeightCm || 0,
      substrateType: specifications.substrateType || 'Couche',
      substrateWeightGsm: specifications.substrateWeightGsm || 150,
      substrateBrand: specifications.substrateBrand || '',
      colorsFront: specifications.colorsFront || 4,
      colorsBack: specifications.colorsBack || 0,
      pantoneColors: specifications.pantoneColors || [],
      finishingOperations: specifications.finishingOperations || [],
      packagingNotes: specifications.packagingNotes || '',
    },
  });

  const widthCm = form.watch('finishedWidthCm');
  const heightCm = form.watch('finishedHeightCm');
  const pantoneColors = form.watch('pantoneColors');
  const finishingOperations = form.watch('finishingOperations');

  const onSubmit = (data: Specifications) => {
    setSpecifications(data);
    onNext();
  };

  const addPantone = () => {
    if (newPantone.trim()) {
      const current = form.getValues('pantoneColors');
      form.setValue('pantoneColors', [...current, newPantone.trim().toUpperCase()]);
      setNewPantone('');
    }
  };

  const removePantone = (index: number) => {
    const current = form.getValues('pantoneColors');
    form.setValue('pantoneColors', current.filter((_, i) => i !== index));
  };

  const toggleFinishing = (id: string, checked: boolean) => {
    const current = form.getValues('finishingOperations');
    if (checked) {
      form.setValue('finishingOperations', [...current, id]);
    } else {
      form.setValue('finishingOperations', current.filter((op) => op !== id));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1: Dimensions */}
        <div className="bg-muted/50 rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Ruler className="h-4 w-4" />
            Dimensiones
          </div>
          
          {/* Product Type */}
          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium">Tipo de Producto</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Width x Height side by side */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="finishedWidthCm"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Ancho (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      className="h-12"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="finishedHeightCm"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Alto (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      className="h-12"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Visual preview */}
          {widthCm > 0 && heightCm > 0 && (
            <div className="flex items-center justify-center pt-2">
              <div 
                className="border-2 border-dashed border-primary/40 bg-primary/5 rounded flex items-center justify-center text-xs text-muted-foreground"
                style={{
                  width: Math.min(widthCm * 3, 120),
                  height: Math.min(heightCm * 3, 80),
                }}
              >
                {widthCm} × {heightCm}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Substrate */}
        <div className="bg-muted/50 rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <FileText className="h-4 w-4" />
            Sustrato
          </div>
          
          <FormField
            control={form.control}
            name="substrateType"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium">Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUBSTRATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substrateWeightGsm"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium">Gramaje (g/m²)</FormLabel>
                <Select
                  value={field.value.toString()}
                  onValueChange={(v) => field.onChange(parseInt(v))}
                >
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUBSTRATE_WEIGHTS.map((weight) => (
                      <SelectItem key={weight} value={weight.toString()}>{weight} gsm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Collapsible open={showSubstrateBrand} onOpenChange={setShowSubstrateBrand}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <Plus className="h-3 w-3" />
                Marca/Proveedor
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <FormField
                control={form.control}
                name="substrateBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Ej: CMPC, Papelera..." className="h-12" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Card 3: Colors */}
        <div className="bg-muted/50 rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Palette className="h-4 w-4" />
            Colores
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="colorsFront"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Tiro (Frente)</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: opt.value }).map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                              ))}
                            </div>
                            <span>{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colorsBack"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Retiro (Reverso)</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: opt.value }).map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                              ))}
                            </div>
                            <span>{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* Pantone Colors */}
          <Collapsible open={showPantones} onOpenChange={setShowPantones}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <Plus className="h-3 w-3" />
                Colores especiales (Pantone)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: PMS 485 C"
                  value={newPantone}
                  onChange={(e) => setNewPantone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPantone())}
                  className="h-10"
                />
                <Button type="button" variant="outline" onClick={addPantone} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {pantoneColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pantoneColors.map((color, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pl-2">
                      {color}
                      <button type="button" onClick={() => removePantone(index)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Card 4: Finishing */}
        <div className="bg-muted/50 rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Scissors className="h-4 w-4" />
            Terminaciones
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FINISHING_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                  finishingOperations.includes(option.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background hover:bg-muted'
                )}
              >
                <Checkbox
                  id={option.id}
                  checked={finishingOperations.includes(option.id)}
                  onCheckedChange={(checked) => toggleFinishing(option.id, checked as boolean)}
                  className="sr-only"
                />
                <span className="text-lg">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>

          <Collapsible open={showMoreFinishing} onOpenChange={setShowMoreFinishing}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <ChevronDown className={cn('h-4 w-4 transition-transform', showMoreFinishing && 'rotate-180')} />
                Ver más
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                {MORE_FINISHING.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                      finishingOperations.includes(option.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      id={option.id}
                      checked={finishingOperations.includes(option.id)}
                      onCheckedChange={(checked) => toggleFinishing(option.id, checked as boolean)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Sticky Bottom Actions */}
        <OTFormActions
          onPrev={onPrev}
          onNext={form.handleSubmit(onSubmit)}
        />
      </form>
    </Form>
  );
}
