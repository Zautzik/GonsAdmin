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
      case 'all':
        return counts.all;
      case 'draft':
        return counts.draft;
      case 'in_production':
        return counts.inProduction;
      case 'completed':
        return counts.completed;
      case 'overdue':
        return counts.overdue;
      default:
        return 0;
    }
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count = getCount(filter.key);
          
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/50 hover:bg-accent"
              )}
            >
              {filter.label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advanced Filters Link */}
      <button
        onClick={onAdvancedFilters}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Filtros Avanzados
      </button>
    </div>
  );
}
