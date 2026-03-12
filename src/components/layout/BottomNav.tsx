import { NavLink, useLocation } from 'react-router-dom';
import {
  Handshake,
  DollarSign,
  Send,
  UserPlus,
  User,
  BarChart3,
  UsersRound,
  Settings,
  Trophy,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const memberItems: NavItem[] = [
  { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao' },
  { icon: DollarSign, label: 'Negócios', path: '/negocios' },
  { icon: Send, label: 'Indicações', path: '/indicacoes' },
  { icon: UserPlus, label: 'Convites', path: '/convites' },
  { icon: User, label: 'Perfil', path: '/perfil' },
];

const adminItems: NavItem[] = [
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
  { icon: UsersRound, label: 'Pessoas', path: '/admin/pessoas' },
  { icon: Settings, label: 'Admin', path: '/admin' },
  { icon: Trophy, label: 'Ranking', path: '/ranking' },
];

const facilitadorItems: NavItem[] = [
  { icon: Settings, label: 'Admin', path: '/admin' },
  { icon: UsersRound, label: 'Pessoas', path: '/admin/pessoas' },
  { icon: Calendar, label: 'Encontros', path: '/encontros' },
  { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas' },
];

export default function BottomNav() {
  const { role, isLoading } = useAdmin();
  const location = useLocation();

  if (isLoading) return null;

  const items = role === 'admin' ? adminItems : role === 'facilitador' ? facilitadorItems : memberItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors',
                isActive && 'text-primary'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
