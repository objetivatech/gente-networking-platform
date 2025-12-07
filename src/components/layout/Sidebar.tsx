import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  User,
  BarChart3,
  Handshake,
  MessageSquare,
  DollarSign,
  Send,
  Users,
  Calendar,
  GraduationCap,
  Settings,
  LogOut,
  X,
  Trophy,
  UserPlus,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: User, label: 'Meu Perfil', path: '/perfil' },
  { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas' },
  { icon: Trophy, label: 'Ranking', path: '/ranking' },
  { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao' },
  { icon: MessageSquare, label: 'Depoimentos', path: '/depoimentos' },
  { icon: DollarSign, label: 'Negócios', path: '/negocios' },
  { icon: Send, label: 'Indicações', path: '/indicacoes' },
  { icon: Users, label: 'Equipes', path: '/equipes' },
  { icon: Calendar, label: 'Encontros', path: '/encontros' },
  { icon: GraduationCap, label: 'Conteúdos', path: '/conteudos' },
  { icon: UserPlus, label: 'Convites', path: '/convites' },
  { icon: BookOpen, label: 'Documentação', path: '/documentacao' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const adminItems = [
  { icon: Settings, label: 'Admin', path: '/admin' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Overlay para mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Gente</h1>
                <p className="text-xs opacity-80">Networking</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}

            <div className="pt-4 mt-4 border-t border-sidebar-border">
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
