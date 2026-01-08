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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Check, ChevronsUpDown, ArrowRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client */}
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente *</FormLabel>
                    <Popover open={clientOpen} onOpenChange={setClientOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value || 'Seleccionar cliente...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-2">
                                <p className="text-sm text-muted-foreground mb-2">No se encontró cliente</p>
                                <Input
                                  placeholder="Nuevo cliente..."
                                  value={field.value}
                                  onChange={(e) => {
                                    form.setValue('clientName', e.target.value);
                                    form.setValue('clientId', '');
                                  }}
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
                                    <p>{client.name}</p>
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
                  </FormItem>
                )}
              />

              {/* Product Name */}
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Etiquetas, Cajas, Folletos..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Entrega *</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP', { locale: es })
                            ) : (
                              'Seleccionar fecha'
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
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

              {/* Budget Code */}
              <FormField
                control={form.control}
                name="budgetCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Presupuesto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: COT-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="productDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Producto</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe las características del producto..."
                      className="min-h-20"
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
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones especiales, comentarios..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" className="gap-2">
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
