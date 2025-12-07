import { cn } from '@/lib/utils';
import { Sprout, Medal, Award, Trophy, Gem } from 'lucide-react';

type Rank = 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante' | null | undefined;

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const rankConfig: Record<NonNullable<Rank>, { 
  label: string; 
  Icon: React.ComponentType<{ className?: string }>; 
  className: string;
  iconClassName: string;
}> = {
  iniciante: {
    label: 'Iniciante',
    Icon: Sprout,
    className: 'bg-muted text-muted-foreground border-border',
    iconClassName: 'text-muted-foreground',
  },
  bronze: {
    label: 'Bronze',
    Icon: Medal,
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700',
    iconClassName: 'text-amber-600 dark:text-amber-400',
  },
  prata: {
    label: 'Prata',
    Icon: Award,
    className: 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500',
    iconClassName: 'text-slate-500 dark:text-slate-300',
  },
  ouro: {
    label: 'Ouro',
    Icon: Trophy,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-600',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  diamante: {
    label: 'Diamante',
    Icon: Gem,
    className: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-600',
    iconClassName: 'text-sky-500 dark:text-sky-400',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export default function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const safeRank = rank || 'iniciante';
  const config = rankConfig[safeRank];
  const { Icon } = config;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.className,
        sizeClasses[size]
      )}
    >
      <Icon className={cn(iconSizes[size], config.iconClassName)} aria-label={config.label} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
