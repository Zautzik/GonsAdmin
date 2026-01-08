import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOTFormStore, Specifications } from '@/stores/otFormStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import { useState } from 'react';

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
  'Etiquetas',
  'Cajas',
  'Estuches',
  'Folletos',
  'Catálogos',
  'Afiches',
  'Tarjetas',
  'Sobres',
  'Bolsas',
  'Displays',
  'Otro',
];

const SUBSTRATE_TYPES = [
  'Couche',
  'Bond',
  'Kraft',
  'Cartulina',
  'Cartón',
  'Adhesivo',
  'Sintético',
  'Metalizado',
  'Vegetal',
  'Otro',
];

const SUBSTRATE_WEIGHTS = [80, 90, 115, 130, 150, 170, 200, 250, 300, 350];

const COLOR_OPTIONS = [
  { value: '0', label: '0 (Sin impresión)' },
  { value: '1', label: '1 color' },
  { value: '2', label: '2 colores' },
  { value: '3', label: '3 colores' },
  { value: '4', label: '4 colores (CMYK)' },
  { value: '5', label: '5 colores' },
  { value: '6', label: '6 colores' },
];

const FINISHING_OPTIONS = [
  { id: 'die_cutting', label: 'Troquelado' },
  { id: 'folding', label: 'Plegado' },
  { id: 'gluing', label: 'Pegado' },
  { id: 'lamination', label: 'Laminado' },
  { id: 'varnish', label: 'Barniz' },
  { id: 'embossing', label: 'Relieve' },
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
        {/* Product Type & Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle>Producto</CardTitle>
            <CardDescription>Tipo y dimensiones finales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Producto *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="finishedWidthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ancho Final (cm) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
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
                  <FormItem>
                    <FormLabel>Alto Final (cm) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Substrate */}
        <Card>
          <CardHeader>
            <CardTitle>Sustrato</CardTitle>
            <CardDescription>Material de impresión</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="substrateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBSTRATE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <FormItem>
                    <FormLabel>Gramaje (g/m²) *</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="substrateBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca/Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: CMPC, Papelera..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Colores</CardTitle>
            <CardDescription>Configuración de impresión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="colorsFront"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colores Tiro (Frente)</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLOR_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="colorsBack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colores Retiro (Reverso)</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLOR_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pantone Colors */}
            <div>
              <FormLabel>Colores Especiales (Pantone)</FormLabel>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Ej: PMS 485 C"
                  value={newPantone}
                  onChange={(e) => setNewPantone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPantone())}
                />
                <Button type="button" variant="outline" onClick={addPantone}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {pantoneColors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {pantoneColors.map((color, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {color}
                      <button type="button" onClick={() => removePantone(index)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Finishing */}
        <Card>
          <CardHeader>
            <CardTitle>Terminaciones</CardTitle>
            <CardDescription>Procesos de acabado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {FINISHING_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={finishingOperations.includes(option.id)}
                    onCheckedChange={(checked) => toggleFinishing(option.id, checked as boolean)}
                  />
                  <label
                    htmlFor={option.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="packagingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de Empaque</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones de empaque, cantidad por caja..."
                      className="min-h-16"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button type="submit" className="gap-2">
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
