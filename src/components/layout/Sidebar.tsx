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
  History,
  Contact,
  Cake,
  UsersRound,
  ClipboardList,
  Rss,
  MessageCircle,
  Ticket,
  HeartHandshake,
  Megaphone,
  Radio,
  KanbanSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
const logoGente = '/logo-gente-comunidade.png';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// Itens de menu com permissões por role
// roles: undefined = todos podem ver, array = apenas roles listados
const menuItems = [
  { icon: Home, label: 'Início', path: '/', roles: undefined },
  { icon: Rss, label: 'Feed', path: '/feed', roles: ['admin', 'facilitador', 'membro'] },
  { icon: User, label: 'Meu Perfil', path: '/perfil', roles: undefined },
  { icon: Contact, label: 'Membros', path: '/membros', roles: ['admin', 'facilitador', 'membro'] },
  { icon: HeartHandshake, label: 'MatchMaking', path: '/matchmaking', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Ticket, label: 'Convidados', path: '/convidados', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Cake, label: 'Aniversários', path: '/aniversarios', roles: ['admin', 'facilitador', 'membro'] },
  { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Trophy, label: 'Ranking', path: '/ranking', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao', roles: ['admin', 'facilitador', 'membro'] },
  { icon: MessageSquare, label: 'Depoimentos', path: '/depoimentos', roles: ['admin', 'facilitador', 'membro'] },
  { icon: DollarSign, label: 'Negócios', path: '/negocios', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Send, label: 'Indicações', path: '/indicacoes', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Megaphone, label: 'Oportunidades', path: '/oportunidades', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Radio, label: 'Pedidos de Indicação', path: '/pedidos-indicacao', roles: ['admin', 'facilitador', 'membro'] },
  
  { icon: Calendar, label: 'Encontros', path: '/encontros', roles: ['admin', 'facilitador', 'membro'] },
  { icon: GraduationCap, label: 'Conteúdos', path: '/conteudos', roles: ['admin', 'facilitador', 'membro'] },
  { icon: MessageCircle, label: 'Conselho 24/7', path: '/conselho', roles: ['admin', 'facilitador', 'membro'] },
  { icon: UserPlus, label: 'Convites', path: '/convites', roles: ['admin', 'facilitador', 'membro'] },
  { icon: History, label: 'Changelog', path: '/changelog', roles: ['admin', 'facilitador', 'membro'] },
  { icon: BookOpen, label: 'Documentação', path: '/documentacao', roles: ['admin', 'facilitador', 'membro'] },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', roles: undefined },
];

const adminItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
  { icon: UsersRound, label: 'Gestão de Pessoas', path: '/admin/pessoas', roles: ['admin', 'facilitador'] },
  { icon: KanbanSquare, label: 'CRM de Leads', path: '/admin/crm', roles: ['admin'] },
  { icon: ClipboardList, label: 'Gestão de Registros', path: '/admin/registros', roles: ['admin'] },
  { icon: Settings, label: 'Admin', path: '/admin', roles: ['admin', 'facilitador'] },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, isLoading } = useAdmin();

  const handleSignOut = async () => {
    await signOut();
  };

  // Filtra itens de menu baseado no role do usuário
  const filterByRole = (items: typeof menuItems) => {
    if (isLoading || !role) return items.filter(item => !item.roles);
    return items.filter(item => !item.roles || item.roles.includes(role));
  };

  const visibleMenuItems = filterByRole(menuItems);
  const visibleAdminItems = filterByRole(adminItems);

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
              <img 
                src={logoGente} 
                alt="Gente Comunidade" 
                className="w-28 h-auto"
              />
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
            {visibleMenuItems.map((item) => (
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

            {visibleAdminItems.length > 0 && (
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <p className="px-3 py-2 text-xs font-semibold uppercase text-sidebar-foreground/50">
                  Administração
                </p>
                {visibleAdminItems.map((item) => (
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
            )}
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
