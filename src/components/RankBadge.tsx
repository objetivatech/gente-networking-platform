import { cn } from '@/lib/utils';
import { Sprout, Award } from 'lucide-react';

type Rank = 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const rankConfig: Record<Rank, { label: string; emoji: string; className: string }> = {
  iniciante: {
    label: 'Iniciante',
    emoji: '🌱',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  bronze: {
    label: 'Bronze',
    emoji: '🥉',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200',
  },
  prata: {
    label: 'Prata',
    emoji: '🥈',
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  },
  ouro: {
    label: 'Ouro',
    emoji: '🥇',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-200',
  },
  diamante: {
    label: 'Diamante',
    emoji: '💎',
    className: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const config = rankConfig[rank];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        sizeClasses[size]
      )}
    >
      <span>{config.emoji}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
