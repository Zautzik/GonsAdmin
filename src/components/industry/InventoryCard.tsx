import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './shared/StatusBadge';
import { Minus, Plus, MapPin } from 'lucide-react';

interface InventoryCardProps {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint?: number;
  unit: string;
  location?: string;
  onUse: () => void;
  onReceive: () => void;
}

export function InventoryCard({
  name,
  sku,
  category,
  currentStock,
  reorderPoint,
  unit,
  location,
  onUse,
  onReceive
}: InventoryCardProps) {
  const stockStatus = 
    currentStock === 0 ? 'out_of_stock' :
    (reorderPoint && currentStock < reorderPoint) ? 'low_stock' :
    'ok';

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{sku}</p>
          </div>
          <StatusBadge status={stockStatus} />
        </div>

        {/* Category & Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span className="bg-secondary px-2 py-0.5 rounded text-xs">{category}</span>
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
        </div>

        {/* Stock Info */}
        <div className="mb-4">
          <p className="text-2xl font-bold">
            {currentStock} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
          {reorderPoint && (
            <p className="text-xs text-muted-foreground">
              Punto de reorden: {reorderPoint} {unit}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1" 
            onClick={onUse}
            disabled={currentStock === 0}
          >
            <Minus className="h-3.5 w-3.5 mr-1" />
            Usar
          </Button>
          <Button size="sm" variant="default" className="flex-1" onClick={onReceive}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Recibir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
