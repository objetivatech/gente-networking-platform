import { cn } from '@/lib/utils';

type Rank = 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante' | null | undefined;

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const rankConfig: Record<NonNullable<Rank>, { label: string; icon: string; className: string }> = {
  iniciante: {
    label: 'Iniciante',
    icon: '🌱',
    className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  },
  bronze: {
    label: 'Bronze',
    icon: '🥉',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200',
  },
  prata: {
    label: 'Prata',
    icon: '🥈',
    className: 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200',
  },
  ouro: {
    label: 'Ouro',
    icon: '🥇',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-200',
  },
  diamante: {
    label: 'Diamante',
    icon: '💎',
    className: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  // Handle null/undefined rank
  const safeRank = rank || 'iniciante';
  const config = rankConfig[safeRank];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.className,
        sizeClasses[size]
      )}
    >
      <span className={iconSizes[size]} role="img" aria-label={config.label}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
