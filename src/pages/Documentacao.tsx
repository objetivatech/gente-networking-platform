import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Settings, 
  Code, 
  Database, 
  Zap, 
  Shield, 
  Trophy,
  Handshake,
  MessageSquare,
  DollarSign,
  Send,
  Calendar,
  GraduationCap,
  UserPlus,
  BarChart3
} from 'lucide-react';

export default function Documentacao() {
  const { isAdmin, isFacilitator, isMember, isGuest, isLoading } = useAdmin();

  // Convidados não têm acesso à documentação
  if (isGuest && !isLoading) {
    return <Navigate to="/" replace />;
  }

  // Determinar quais tabs mostrar
  const showMemberDocs = isAdmin || isFacilitator || isMember;
  const showAdminDocs = isAdmin;
  const showDevDocs = isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentação</h1>
          <p className="text-muted-foreground">Guia completo do sistema Gente Networking</p>
        </div>
      </div>

      <Tabs defaultValue="member" className="space-y-4">
        <TabsList className={`grid w-full ${showAdminDocs ? (showDevDocs ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
          {showMemberDocs && <TabsTrigger value="member">Uso do Sistema</TabsTrigger>}
          {showAdminDocs && <TabsTrigger value="admin">Administração</TabsTrigger>}
          {showDevDocs && <TabsTrigger value="dev">Desenvolvimento</TabsTrigger>}
        </TabsList>

        {/* Documentação para Membros e Facilitadores */}
        {showMemberDocs && (
          <TabsContent value="member">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-6 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Bem-vindo ao Gente Networking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                      O Gente Networking é uma plataforma de gestão de comunidade focada em networking profissional. 
                      Aqui você pode registrar suas atividades, fazer conexões e acompanhar seu progresso.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Sistema de Pontuação e Ranks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Acumule pontos participando das atividades da comunidade:
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Handshake className="h-4 w-4" /> Gente em Ação</span>
                        <Badge>10 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Depoimentos</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Indicações</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Presenças</span>
                        <Badge>25 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Convites Aceitos</span>
                        <Badge>30 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Negócios</span>
                        <Badge>1 pt / R$100</Badge>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold mt-4">Níveis:</h4>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">🌱 <strong>Iniciante:</strong> 0-49 pontos</div>
                      <div className="flex items-center gap-2">🥉 <strong>Bronze:</strong> 50-199 pontos</div>
                      <div className="flex items-center gap-2">🥈 <strong>Prata:</strong> 200-499 pontos</div>
                      <div className="flex items-center gap-2">🥇 <strong>Ouro:</strong> 500-999 pontos</div>
                      <div className="flex items-center gap-2">💎 <strong>Diamante:</strong> 1000+ pontos</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Handshake className="h-5 w-5" />
                      Gente em Ação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Registre suas reuniões 1-a-1 com outros membros ou convidados externos.</p>
                    <ul>
                      <li><strong>Com Membro:</strong> Selecione o membro da comunidade</li>
                      <li><strong>Com Convidado:</strong> Informe nome e empresa do convidado</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Depoimentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Envie depoimentos para outros membros destacando suas qualidades profissionais.</p>
                    <p>Os depoimentos recebidos aparecem no seu perfil e o membro é notificado por email.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Indicações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Compartilhe contatos qualificados com outros membros.</p>
                    <ul>
                      <li>Informe o nome, telefone e email do contato</li>
                      <li>Adicione notas sobre o contexto da indicação</li>
                      <li>O membro será notificado por email automaticamente</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Negócios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Registre negócios fechados através da comunidade.</p>
                    <ul>
                      <li>Informe o valor do negócio</li>
                      <li>Selecione quem fez a indicação (se aplicável)</li>
                      <li>Esses dados aparecem nas estatísticas da comunidade</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Convites
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Convide novos membros para a comunidade e ganhe pontos!</p>
                    <ul>
                      <li>Crie um código de convite único</li>
                      <li>Compartilhe o link ou código com o convidado</li>
                      <li>Acompanhe o status do convite</li>
                      <li>Ganhe 30 pontos quando seu convite for aceito</li>
                      <li>Convites expiram em 30 dias</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* Documentação para Administradores - APENAS ADMIN */}
        {showAdminDocs && (
          <TabsContent value="admin">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-6 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Painel de Administração
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                      Administradores têm acesso completo ao sistema, podendo gerenciar equipes, 
                      membros, encontros e conteúdos.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gerenciamento de Equipes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <ul>
                      <li><strong>Criar Equipes:</strong> Nome, descrição e cor identificadora</li>
                      <li><strong>Adicionar Membros:</strong> Vincule membros às equipes</li>
                      <li><strong>Promover Facilitadores:</strong> Defina líderes de cada equipe</li>
                      <li><strong>Remover Membros:</strong> Desvincule membros de equipes</li>
                      <li><strong>Promover Convidados:</strong> Transforme convidados em membros</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Permissões por Perfil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <h4>Admin</h4>
                    <ul>
                      <li>Acesso completo ao sistema</li>
                      <li>Criar/editar/excluir equipes</li>
                      <li>Definir facilitadores</li>
                      <li>Migrar membros entre equipes</li>
                      <li>Promover convidados a membros</li>
                    </ul>
                    <h4>Facilitador</h4>
                    <ul>
                      <li>Gerenciar apenas sua equipe</li>
                      <li>Adicionar apenas convidados à equipe (para encontros)</li>
                      <li>Remover membros da sua equipe</li>
                      <li>Criar convites</li>
                    </ul>
                    <h4>Membro</h4>
                    <ul>
                      <li>Registrar atividades (Gente em Ação, Depoimentos, etc.)</li>
                      <li>Criar convites</li>
                      <li>Visualizar ranking e estatísticas</li>
                    </ul>
                    <h4>Convidado</h4>
                    <ul>
                      <li>Visualizar perfil e configurações</li>
                      <li>Aguardar promoção para membro</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Gerenciamento de Encontros
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <ul>
                      <li><strong>Criar Encontros:</strong> Título, data, horário e local</li>
                      <li><strong>Vincular a Equipes:</strong> Associe encontros a equipes específicas</li>
                      <li><strong>Acompanhar Presenças:</strong> Visualize quem confirmou presença</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Gerenciamento de Conteúdos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Adicione materiais educativos para os membros:</p>
                    <ul>
                      <li><strong>Vídeos:</strong> Links do YouTube ou outras plataformas</li>
                      <li><strong>Documentos:</strong> PDFs e materiais de apoio</li>
                      <li><strong>Artigos:</strong> Conteúdo educacional</li>
                      <li><strong>Links:</strong> Recursos externos úteis</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Relatórios e Estatísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Acompanhe métricas da comunidade:</p>
                    <ul>
                      <li>Total de membros e distribuição por rank</li>
                      <li>Valor total de negócios realizados</li>
                      <li>Quantidade de indicações e depoimentos</li>
                      <li>Ranking de membros mais ativos</li>
                      <li>Evolução mensal das atividades</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* Documentação para Desenvolvedores - APENAS ADMIN */}
        {showDevDocs && (
          <TabsContent value="dev">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-6 pr-4">
                {/* Rotas e Páginas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Rotas e Páginas
                    </CardTitle>
                    <CardDescription>Mapeamento completo das rotas do sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 text-sm">
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/auth</code>
                        <p className="text-muted-foreground mt-1">Login, cadastro e recuperação de senha</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/</code>
                        <p className="text-muted-foreground mt-1">Dashboard principal com feed de atividades</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/perfil</code>
                        <p className="text-muted-foreground mt-1">Perfil do usuário com histórico de pontos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/membros</code>
                        <p className="text-muted-foreground mt-1">Diretório de membros com filtros avançados e exportação</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/membro/:id</code>
                        <p className="text-muted-foreground mt-1">Perfil individual de membro com URL compartilhável</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/aniversarios</code>
                        <p className="text-muted-foreground mt-1">Calendário de aniversários da comunidade</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/ranking</code>
                        <p className="text-muted-foreground mt-1">Ranking de membros por pontuação</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/gente-em-acao</code>
                        <p className="text-muted-foreground mt-1">Registro de reuniões 1-a-1</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/depoimentos</code>
                        <p className="text-muted-foreground mt-1">Envio e visualização de depoimentos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/indicacoes</code>
                        <p className="text-muted-foreground mt-1">Indicações de contatos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/negocios</code>
                        <p className="text-muted-foreground mt-1">Registro de negócios fechados</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/encontros</code>
                        <p className="text-muted-foreground mt-1">Calendário de encontros</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/convites</code>
                        <p className="text-muted-foreground mt-1">Gerenciamento de convites</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/equipes</code>
                        <p className="text-muted-foreground mt-1">Gestão de equipes (Admin/Facilitador)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/estatisticas</code>
                        <p className="text-muted-foreground mt-1">Gráficos e métricas do sistema</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/conteudos</code>
                        <p className="text-muted-foreground mt-1">Materiais educativos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/admin</code>
                        <p className="text-muted-foreground mt-1">Painel administrativo (apenas Admin)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/configuracoes</code>
                        <p className="text-muted-foreground mt-1">Configurações e preferências</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/documentacao</code>
                        <p className="text-muted-foreground mt-1">Esta página de documentação</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/changelog</code>
                        <p className="text-muted-foreground mt-1">Histórico de versões e atualizações</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/instalar</code>
                        <p className="text-muted-foreground mt-1">Instruções de instalação PWA</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">/convite/:code</code>
                        <p className="text-muted-foreground mt-1">Página pública de convite</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Componentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Componentes Principais
                    </CardTitle>
                    <CardDescription>Componentes reutilizáveis do sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 text-sm">
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">PasswordStrengthIndicator</code>
                        <p className="text-muted-foreground mt-1">Indicador visual de força da senha (fraca/média/forte)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">PointsEvolutionChart</code>
                        <p className="text-muted-foreground mt-1">Gráfico de evolução de pontos do usuário</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">RankBadge</code>
                        <p className="text-muted-foreground mt-1">Badge visual do rank do usuário</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">ActivityFeed</code>
                        <p className="text-muted-foreground mt-1">Feed de atividades em tempo real</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">MemberSelect</code>
                        <p className="text-muted-foreground mt-1">Seletor de membros reutilizável</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">ScoringRulesCard</code>
                        <p className="text-muted-foreground mt-1">Exibe regras de pontuação</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">OfflineIndicator</code>
                        <p className="text-muted-foreground mt-1">Indicador de modo offline</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">PWAInstallPrompt</code>
                        <p className="text-muted-foreground mt-1">Prompt de instalação PWA</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Stack Tecnológica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Frontend:</strong> React + TypeScript + Vite
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Estilização:</strong> Tailwind CSS + Shadcn/UI
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Estado:</strong> React Query (TanStack Query)
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Roteamento:</strong> React Router DOM
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Gráficos:</strong> Recharts
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>Forms:</strong> React Hook Form + Zod
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <strong>PWA:</strong> vite-plugin-pwa
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Backend (Supabase)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h4 className="font-semibold">Tabelas Principais:</h4>
                    <div className="grid gap-2 text-sm font-mono">
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>profiles</code>
                        <span className="text-muted-foreground text-xs">Perfis de usuários</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>user_roles</code>
                        <span className="text-muted-foreground text-xs">Roles (admin, facilitador, membro, convidado)</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>teams</code>
                        <span className="text-muted-foreground text-xs">Equipes de networking</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>team_members</code>
                        <span className="text-muted-foreground text-xs">Membros das equipes</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>meetings</code>
                        <span className="text-muted-foreground text-xs">Encontros quinzenais</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>attendances</code>
                        <span className="text-muted-foreground text-xs">Presenças em encontros</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>gente_em_acao</code>
                        <span className="text-muted-foreground text-xs">Reuniões 1-a-1</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>testimonials</code>
                        <span className="text-muted-foreground text-xs">Depoimentos</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>business_deals</code>
                        <span className="text-muted-foreground text-xs">Negócios fechados</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>referrals</code>
                        <span className="text-muted-foreground text-xs">Indicações de contatos</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>activity_feed</code>
                        <span className="text-muted-foreground text-xs">Feed de atividades</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>contents</code>
                        <span className="text-muted-foreground text-xs">Conteúdos educativos</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>invitations</code>
                        <span className="text-muted-foreground text-xs">Convites de membros</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>points_history</code>
                        <span className="text-muted-foreground text-xs">Histórico de pontos</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Edge Functions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">send-email</code>
                        <p className="text-sm text-muted-foreground mt-1">Envio de emails via Resend</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">send-notification</code>
                        <p className="text-sm text-muted-foreground mt-1">Notificações de depoimentos e indicações</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <code className="font-bold">rdstation</code>
                        <p className="text-sm text-muted-foreground mt-1">Integração com RD Station Marketing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Segurança (RLS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Todas as tabelas possuem Row Level Security (RLS) habilitado:</p>
                    <ul>
                      <li>Roles são armazenados em tabela separada (user_roles)</li>
                      <li>Função <code>has_role()</code> com SECURITY DEFINER</li>
                      <li>Função <code>is_team_facilitator()</code> para validar facilitadores</li>
                      <li>Função <code>is_guest()</code> para validar convidados</li>
                      <li>Políticas específicas por ação (SELECT, INSERT, UPDATE, DELETE)</li>
                      <li>Facilitadores só podem adicionar convidados às suas equipes</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
