import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, Calendar, MoreVertical, Eye, Edit, Copy, FileDown, Trash2 } from 'lucide-react';
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
  onDownloadPDF: () => void;
  onDelete?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { 
    label: 'Borrador', 
    className: 'bg-muted text-muted-foreground' 
  },
  approved: { 
    label: 'Aprobada', 
    className: 'bg-primary/10 text-primary' 
  },
  in_production: { 
    label: 'En Producción', 
    className: 'bg-primary/10 text-primary' 
  },
  completed: { 
    label: 'Completada', 
    className: 'bg-success/10 text-success' 
  },
  delivered: { 
    label: 'Entregada', 
    className: 'bg-success/10 text-success' 
  },
  cancelled: { 
    label: 'Cancelada', 
    className: 'bg-muted text-muted-foreground' 
  },
};

export function OTCard({ order, onView, onEdit, onDuplicate, onDownloadPDF, onDelete }: OTCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const status = STATUS_CONFIG[order.status || 'draft'] || STATUS_CONFIG.draft;
  
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
  const daysUntilDelivery = deliveryDate ? differenceInDays(deliveryDate, new Date()) : null;
  
  const isOverdue = daysUntilDelivery !== null && daysUntilDelivery < 0 && 
    order.status !== 'completed' && order.status !== 'delivered';
  const isUrgent = daysUntilDelivery !== null && daysUntilDelivery >= 0 && daysUntilDelivery <= 3;
  
  // Override status for overdue items
  const displayStatus = isOverdue 
    ? { label: 'Atrasada', className: 'bg-destructive/10 text-destructive' }
    : status;
  
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
    <div 
      className={cn(
        "bg-card rounded-lg border border-border p-6",
        "shadow-sm hover:shadow-md",
        "hover:scale-[1.02]",
        "transition-all duration-200 ease-out",
        "cursor-pointer"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          OT #{order.ot_number}
        </span>
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          displayStatus.className
        )}>
          {displayStatus.label}
        </span>
      </div>
      
      {/* Client & Product */}
      <div className="space-y-1 mb-6">
        <h3 className="font-semibold text-foreground text-lg">
          {order.client_name}
        </h3>
        <p className="text-muted-foreground">
          {order.product_name}
        </p>
      </div>
      
      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{order.quantity.toLocaleString()} unidades</span>
        </div>
        
        {deliveryDate && (
          <div className={cn(
            'flex items-center gap-2 text-sm',
            isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-muted-foreground'
          )}>
            <Calendar className="h-4 w-4" />
            <span>Entrega: {getDeliveryText()}</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="gap-2"
        >
          Ver Detalles
        </Button>
        
        <div className={cn(
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0 md:opacity-0"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>Ver</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>Duplicar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownloadPDF(); }}>
                <FileDown className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>Descargar PDF</span>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    <span>Eliminar</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
