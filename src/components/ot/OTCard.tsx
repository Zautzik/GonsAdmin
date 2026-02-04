import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, Calendar, MoreVertical, Eye, Edit, Copy, Printer, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type WorkOrder = Tables<'work_orders'>;

interface OTCardProps {
  order: WorkOrder;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  approved: { label: 'Aprobada', variant: 'outline' },
  in_production: { label: 'En Producción', variant: 'default' },
  completed: { label: 'Completada', variant: 'outline' },
  delivered: { label: 'Entregada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function OTCard({ order, onView, onEdit, onDuplicate, onPrint }: OTCardProps) {
  const status = STATUS_CONFIG[order.status || 'draft'] || STATUS_CONFIG.draft;
  
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
  const daysUntilDelivery = deliveryDate ? differenceInDays(deliveryDate, new Date()) : null;
  
  const isOverdue = daysUntilDelivery !== null && daysUntilDelivery < 0;
  const isUrgent = daysUntilDelivery !== null && daysUntilDelivery >= 0 && daysUntilDelivery <= 3;
  
  const getDeliveryText = () => {
    if (!deliveryDate) return null;
    const formatted = format(deliveryDate, 'd MMM', { locale: es });
    
    if (isOverdue) {
      return `${formatted} (${Math.abs(daysUntilDelivery!)} días atrasado)`;
    }
    if (daysUntilDelivery === 0) {
      return `${formatted} (Hoy)`;
    }
    if (daysUntilDelivery === 1) {
      return `${formatted} (Mañana)`;
    }
    return `${formatted} (${daysUntilDelivery} días)`;
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          OT #{order.ot_number}
        </span>
        <Badge variant={status.variant} className="text-xs">
          {status.label}
        </Badge>
      </div>
      
      {/* Client & Product */}
      <div className="space-y-1 mb-6">
        <h3 className="font-semibold text-foreground">
          {order.client_name}
        </h3>
        <p className="text-muted-foreground">
          {order.product_name}
        </p>
      </div>
      
      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{order.quantity.toLocaleString()} unidades</span>
        </div>
        
        {deliveryDate && (
          <div className={cn(
            'flex items-center gap-2 text-sm',
            isOverdue && 'text-destructive',
            isUrgent && !isOverdue && 'text-warning'
          )}>
            <Calendar className="h-4 w-4" />
            <span>Entrega: {getDeliveryText()}</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Ver Detalles
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
