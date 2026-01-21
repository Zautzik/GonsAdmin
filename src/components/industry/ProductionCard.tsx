import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './shared/StatusBadge';
import { Package, Eye, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductionCardProps {
  id: string;
  otNumber: number;
  productName: string;
  clientName?: string;
  quantity: number;
  produced: number;
  status: string;
  lastUpdate?: string;
  timeSpentMinutes?: number;
  onReport: () => void;
  onIssue: () => void;
  onViewDetails: () => void;
}

export function ProductionCard({
  otNumber,
  productName,
  clientName,
  quantity,
  produced,
  status,
  lastUpdate,
  timeSpentMinutes = 0,
  onReport,
  onIssue,
  onViewDetails
}: ProductionCardProps) {
  const progress = quantity > 0 ? Math.round((produced / quantity) * 100) : 0;
  const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-primary';

  return (
    <Card className="group hover:shadow-md transition-all">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="cursor-pointer hover:text-primary transition-colors" onClick={onViewDetails}>
            <h3 className="font-bold text-lg">OT-{otNumber}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
              {productName}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Client */}
        {clientName && (
          <p className="text-sm text-muted-foreground mb-2 truncate">{clientName}</p>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">
              {produced.toLocaleString()}/{quantity.toLocaleString()}
            </span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColor} transition-all`} 
              style={{ width: `${Math.min(progress, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-right text-muted-foreground mt-0.5">{progress}%</p>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-muted-foreground">
              {Math.floor(timeSpentMinutes / 60)}h {timeSpentMinutes % 60}m
            </span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: es })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="default" className="flex-1" onClick={onReport}>
            <Package className="h-3.5 w-3.5 mr-1" />
            Reportar
          </Button>
          <Button size="sm" variant="outline" onClick={onIssue}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onViewDetails}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
