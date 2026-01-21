import { Badge } from '@/components/ui/badge';
import { cva, type VariantProps } from 'class-variance-authority';

const statusVariants = cva(
  'border-0',
  {
    variants: {
      status: {
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        in_production: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        approved: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        low_stock: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      }
    },
    defaultVariants: {
      status: 'pending'
    }
  }
);

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  in_production: 'En Producción',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  draft: 'Borrador',
  approved: 'Aprobado',
  on_hold: 'En Espera',
  low_stock: 'Stock Bajo',
  out_of_stock: 'Sin Stock',
  ok: 'OK',
};

interface StatusBadgeProps {
  status: string;
  customLabel?: string;
}

export function StatusBadge({ status, customLabel }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/-/g, '_') || 'pending';
  const label = customLabel || statusLabels[normalizedStatus] || status;
  
  return (
    <Badge className={statusVariants({ status: normalizedStatus as any })}>
      {label}
    </Badge>
  );
}
