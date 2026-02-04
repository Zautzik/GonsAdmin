import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useOTFormStore, JobInfo } from '@/stores/otFormStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Check, ChevronsUpDown, ChevronDown, Minus, Plus, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import OTFormActions from '../OTFormActions';

const formSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'El cliente es requerido'),
  productName: z.string().min(1, 'El nombre del producto es requerido'),
  productDescription: z.string().optional(),
  quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  deliveryDate: z.string().min(1, 'La fecha de entrega es requerida'),
  budgetCode: z.string().optional(),
  priority: z.number().min(1).max(5),
  salesRepId: z.string().optional(),
  notes: z.string().optional(),
});

interface Client {
  id: string;
  name: string;
  rut: string | null;
}

interface Step1Props {
  onNext: () => void;
}

export default function Step1JobInfo({ onNext }: Step1Props) {
  const { jobInfo, setJobInfo } = useOTFormStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const form = useForm<JobInfo>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: jobInfo.clientId || '',
      clientName: jobInfo.clientName || '',
      productName: jobInfo.productName || '',
      productDescription: jobInfo.productDescription || '',
      quantity: jobInfo.quantity || 1000,
      deliveryDate: jobInfo.deliveryDate || '',
      budgetCode: jobInfo.budgetCode || '',
      priority: jobInfo.priority || 3,
      salesRepId: jobInfo.salesRepId || '',
      notes: jobInfo.notes || '',
    },
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name, rut').order('name');
    if (data) setClients(data);
  };

  const onSubmit = (data: JobInfo) => {
    setJobInfo(data);
    onNext();
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      form.setValue('clientId', client.id);
      form.setValue('clientName', client.name);
    }
    setClientOpen(false);
  };

  const quantity = form.watch('quantity');
  const clientName = form.watch('clientName');
  const productName = form.watch('productName');
  const deliveryDate = form.watch('deliveryDate');

  const adjustQuantity = (delta: number) => {
    const current = form.getValues('quantity');
    const newValue = Math.max(1, current + delta);
    form.setValue('quantity', newValue);
  };

  const isValid = form.formState.isValid || (clientName && productName && quantity > 0 && deliveryDate);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Client - Prominent searchable combobox */}
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Cliente</FormLabel>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full h-12 justify-between text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value || 'Buscar o agregar cliente...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground mb-2">No se encontró. Crear nuevo:</p>
                          <Input
                            placeholder="Nombre del cliente..."
                            value={field.value}
                            onChange={(e) => {
                              form.setValue('clientName', e.target.value);
                              form.setValue('clientId', '');
                            }}
                            className="h-10"
                          />
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => handleClientSelect(client.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                form.getValues('clientId') === client.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div>
                              <p className="font-medium">{client.name}</p>
                              {client.rut && <p className="text-xs text-muted-foreground">{client.rut}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
              {field.value && <CheckCircle2 className="absolute right-3 top-10 h-4 w-4 text-success" />}
            </FormItem>
          )}
        />

        {/* Product Name - Large input */}
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Producto</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="Ej: Etiquetas Gatorade, Caja Display..." 
                    className="h-12 pr-10"
                    {...field} 
                  />
                  {field.value && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity with +/- buttons */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Cantidad</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => adjustQuantity(-100)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    className="h-12 text-center text-lg font-medium"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => adjustQuantity(100)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Date */}
        <FormField
          control={form.control}
          name="deliveryDate"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Fecha de Entrega</FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-12 justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value ? (
                        format(new Date(field.value), 'PPP', { locale: es })
                      ) : (
                        'Seleccionar fecha...'
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      field.onChange(date?.toISOString() || '');
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Prioridad</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(v) => field.onChange(parseInt(v))}
              >
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">🔴 Urgente</SelectItem>
                  <SelectItem value="2">🟠 Alta</SelectItem>
                  <SelectItem value="3">🟢 Normal</SelectItem>
                  <SelectItem value="4">🔵 Baja</SelectItem>
                  <SelectItem value="5">⚪ Mínima</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* More Options - Expandable */}
        <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span>Más opciones</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showMoreOptions && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            {/* Budget Code */}
            <FormField
              control={form.control}
              name="budgetCode"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Código de Presupuesto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: COT-2024-001" className="h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="productDescription"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Descripción del Producto</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Características adicionales del producto..."
                      className="min-h-20 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Notas Internas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones especiales, comentarios..."
                      className="min-h-20 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Sticky Bottom Actions */}
        <OTFormActions
          showPrev={false}
          onNext={form.handleSubmit(onSubmit)}
          isNextDisabled={!isValid}
        />
      </form>
    </Form>
  );
}
