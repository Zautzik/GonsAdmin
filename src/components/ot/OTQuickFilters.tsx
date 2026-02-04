import { cn } from '@/lib/utils';

interface OTQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    draft: number;
    inProduction: number;
    completed: number;
    overdue: number;
  };
  onAdvancedFilters: () => void;
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Borradores' },
  { key: 'in_production', label: 'En Producción' },
  { key: 'completed', label: 'Completadas' },
  { key: 'overdue', label: 'Atrasadas' },
];

export function OTQuickFilters({
  activeFilter,
  onFilterChange,
  counts,
  onAdvancedFilters,
}: OTQuickFiltersProps) {
  const getCount = (key: string) => {
    switch (key) {
      case 'all': return counts.all;
      case 'draft': return counts.draft;
      case 'in_production': return counts.inProduction;
      case 'completed': return counts.completed;
      case 'overdue': return counts.overdue;
      default: return 0;
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count = getCount(filter.key);
          
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                'border focus:outline-none focus:ring-2 focus:ring-primary/20',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {filter.label}
              {count > 0 && (
                <span className={cn(
                  'ml-2 text-xs',
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <button
        onClick={onAdvancedFilters}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Filtros Avanzados
      </button>
    </div>
  );
}
