/**
 * Sidebar - Menu principal reorganizado em grupos colapsáveis (v3.26.0).
 * Estado persistente em localStorage; navegação mobile + desktop uniforme.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, User, BarChart3, Handshake, MessageSquare, DollarSign, Send, Users,
  Calendar, GraduationCap, Settings, LogOut, X, Trophy, UserPlus, BookOpen,
  History, Contact, Cake, UsersRound, ClipboardList, Rss, MessageCircle, Ticket,
  HeartHandshake, Megaphone, Radio, KanbanSquare, FileText, ScrollText,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
const logoGente = '/logo-gente-comunidade-branco.png';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  icon: typeof Home;
  label: string;
  path: string;
  roles?: string[];
  /** v3.28.0 — papéis que NÃO devem ver este item na navegação (rota continua acessível por URL). */
  hiddenForRoles?: string[];
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

// v3.28.0: admin não participa das mecânicas de networking; menu foca em gestão.
const HIDE_FOR_ADMIN = ['admin'];

const menuGroups: MenuGroup[] = [
  {
    id: 'inicio',
    label: 'Início',
    defaultOpen: true,
    items: [
      { icon: Home, label: 'Início', path: '/' },
      { icon: Rss, label: 'Feed', path: '/feed', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: User, label: 'Meu Perfil', path: '/perfil' },
    ],
  },
  {
    id: 'comunidade',
    label: 'Comunidade',
    defaultOpen: true,
    items: [
      { icon: Contact, label: 'Membros', path: '/membros', roles: ['admin', 'facilitador', 'membro'] },
      { icon: HeartHandshake, label: 'MatchMaking', path: '/matchmaking', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: Ticket, label: 'Convidados', path: '/convidados', roles: ['admin', 'facilitador', 'membro'] },
      { icon: Cake, label: 'Aniversários', path: '/aniversarios', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: Calendar, label: 'Encontros', path: '/encontros', roles: ['admin', 'facilitador', 'membro'] },
      { icon: MessageCircle, label: 'Conselho 24/7', path: '/conselho', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
    ],
  },
  {
    id: 'networking',
    label: 'Networking',
    items: [
      { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: Send, label: 'Indicações', path: '/indicacoes', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: DollarSign, label: 'Negócios', path: '/negocios', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: MessageSquare, label: 'Depoimentos', path: '/depoimentos', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: Megaphone, label: 'Oportunidades', path: '/oportunidades', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: Radio, label: 'Pedidos de Indicação', path: '/pedidos-indicacao', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
      { icon: UserPlus, label: 'Convites', path: '/convites', roles: ['admin', 'facilitador', 'membro'] },
    ],
  },
  {
    id: 'desempenho',
    label: 'Desempenho',
    items: [
      { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas', roles: ['admin', 'facilitador', 'membro'] },
      { icon: Trophy, label: 'Ranking', path: '/ranking', roles: ['admin', 'facilitador', 'membro'], hiddenForRoles: HIDE_FOR_ADMIN },
    ],
  },
  {
    id: 'conhecimento',
    label: 'Conhecimento',
    items: [
      { icon: GraduationCap, label: 'Conteúdos', path: '/conteudos', roles: ['admin', 'facilitador', 'membro'] },
      { icon: BookOpen, label: 'Documentação', path: '/documentacao', roles: ['admin', 'facilitador', 'membro'] },
      { icon: History, label: 'Changelog', path: '/changelog', roles: ['admin', 'facilitador', 'membro'] },
    ],
  },
];

const adminGroup: MenuGroup = {
  id: 'admin',
  label: 'Administração',
  items: [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
    { icon: UsersRound, label: 'Gestão de Pessoas', path: '/admin/pessoas', roles: ['admin', 'facilitador'] },
    { icon: KanbanSquare, label: 'CRM de Leads', path: '/admin/crm', roles: ['admin'] },
    { icon: ScrollText, label: 'Auditoria CRM', path: '/admin/crm/auditoria', roles: ['admin'] },
    { icon: FileText, label: 'Modelos de Contrato', path: '/admin/contratos', roles: ['admin'] },
    { icon: ClipboardList, label: 'Gestão de Registros', path: '/admin/registros', roles: ['admin'] },
    { icon: Settings, label: 'Admin', path: '/admin', roles: ['admin', 'facilitador'] },
  ],
};

const STORAGE_KEY = 'gente:sidebar-groups:v1';

function readStored(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, isLoading } = useAdmin();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = readStored();
    const initial: Record<string, boolean> = {};
    [...menuGroups, adminGroup].forEach((g) => {
      initial[g.id] = stored[g.id] ?? g.defaultOpen ?? false;
    });
    return initial;
  });

  // Auto-abre grupo que contém rota ativa
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      [...menuGroups, adminGroup].forEach((g) => {
        if (g.items.some((i) => i.path === location.pathname)) next[g.id] = true;
      });
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch { /* ignore */ }
  }, [openGroups]);

  const filterItems = (items: MenuItem[]) => {
    if (isLoading || !role) return items.filter((i) => !i.roles);
    return items.filter(
      (i) =>
        (!i.roles || i.roles.includes(role)) &&
        !(i.hiddenForRoles && i.hiddenForRoles.includes(role)),
    );
  };

  const toggle = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const renderGroup = (group: MenuGroup) => {
    const visible = filterItems(group.items);
    if (visible.length === 0) return null;
    const isOpen = openGroups[group.id];
    return (
      <div key={group.id} className="space-y-1">
        <button
          type="button"
          onClick={() => toggle(group.id)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <span>{group.label}</span>
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {isOpen && (
          <div className="space-y-0.5">
            {visible.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground',
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src={logoGente} alt="Gente Comunidade" className="w-28 h-auto" />
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

          <nav className="flex-1 overflow-y-auto p-3 space-y-3">
            {menuGroups.map(renderGroup)}
            {(!isLoading && role) && filterItems(adminGroup.items).length > 0 && (
              <div className="pt-2 mt-2 border-t border-sidebar-border">
                {renderGroup(adminGroup)}
              </div>
            )}

            <NavLink
              to="/configuracoes"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mt-3',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground',
                )
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="font-medium">Configurações</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={() => signOut()}
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
