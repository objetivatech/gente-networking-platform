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
  BarChart3,
  Rss,
  Smartphone,
  HelpCircle,
  Briefcase,
  User,
  ShieldCheck,
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

                    <h4 className="font-semibold mt-4">Privacidade e Acesso por Grupo</h4>
                    <p className="text-sm text-muted-foreground">
                      Para proteger a privacidade dos membros, o acesso às informações é restrito por grupo:
                    </p>
                    <ul>
                      <li><strong>Membros:</strong> Podem ver apenas informações de outros membros do mesmo grupo</li>
                      <li><strong>Facilitadores:</strong> Têm acesso a informações de todos os grupos</li>
                      <li><strong>Administradores:</strong> Têm acesso completo ao sistema</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Isso significa que você só poderá enviar depoimentos, fazer indicações e visualizar perfis de membros
                      que estão no mesmo grupo que você.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Sistema de Pontuação Mensal por Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-semibold text-primary">Versão 3.0.0</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pontuação mensal por grupo, Feed de Atividades, Conselho 24/7, Cases de Negócio,
                        Perfil v3 com pitch IA, proteção Cloudflare Turnstile e Analytics.
                      </p>
                    </div>

                    <p className="text-muted-foreground">
                      Acumule pontos participando das atividades da comunidade:
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Handshake className="h-4 w-4" /> Gente em Ação</span>
                        <Badge>25 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Presenças</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Indicações</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Case de Negócio (indicador)</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Depoimentos</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Convites Aceitos (com presença)</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Case de Negócio (autor)</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Negócios</span>
                        <Badge>5 pts / R$100</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Resposta no Conselho 24/7</span>
                        <Badge>5 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Melhor Resposta (Conselho)</span>
                        <Badge>+5 pts</Badge>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold mt-4">Níveis:</h4>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">🌱 <strong>Iniciante:</strong> 0-49 pontos</div>
                      <div className="flex items-center gap-2">🥉 <strong>Bronze:</strong> 50-149 pontos</div>
                      <div className="flex items-center gap-2">🥈 <strong>Prata:</strong> 150-299 pontos</div>
                      <div className="flex items-center gap-2">🥇 <strong>Ouro:</strong> 300-499 pontos</div>
                      <div className="flex items-center gap-2">💎 <strong>Diamante:</strong> 500+ pontos</div>
                    </div>

                    <h4 className="font-semibold mt-4">Como funciona:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Seus pontos são calculados separadamente para cada grupo que você participa</li>
                      <li>• O ranking mostra a classificação mensal, com filtros por mês e grupo</li>
                      <li>• No seu perfil, você pode ver um gráfico de evolução mensal</li>
                      <li>• Atividades realizadas em um mês contam apenas para aquele mês</li>
                      <li>• Administradores e Facilitadores não pontuam — a gamificação é exclusiva para membros</li>
                    </ul>
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

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Gente em Ação"</li>
                      <li>Clique em "Registrar Reunião"</li>
                      <li>Escolha o tipo de reunião:
                        <ul>
                          <li><strong>Com Membro:</strong> Selecione o membro do seu grupo</li>
                          <li><strong>Com Convidado:</strong> Informe nome e empresa do convidado externo</li>
                        </ul>
                      </li>
                      <li>Selecione a data da reunião</li>
                      <li>Adicione observações (opcional)</li>
                      <li>Envie uma foto da reunião (opcional)</li>
                      <li>Clique em "Salvar" para ganhar 25 pontos</li>
                    </ol>
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
                    <p>Envie depoimentos para outros membros do seu grupo destacando suas qualidades profissionais.</p>

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Depoimentos"</li>
                      <li>Clique em "Novo Depoimento"</li>
                      <li>Selecione o membro do seu grupo para quem deseja enviar o depoimento</li>
                      <li>Escreva um depoimento sincero destacando qualidades profissionais</li>
                      <li>Clique em "Enviar" para ganhar 15 pontos</li>
                      <li>O membro receberá uma notificação por email</li>
                    </ol>
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
                    <p>Compartilhe contatos qualificados com outros membros do seu grupo.</p>

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Indicações"</li>
                      <li>Clique em "Nova Indicação"</li>
                      <li>Selecione o membro destinatário</li>
                      <li>Preencha os dados do contato (Nome, Telefone, Email)</li>
                      <li>Selecione o status: <strong>Frio 🔵</strong>, <strong>Morno 🟡</strong> ou <strong>Quente 🔴</strong></li>
                      <li>Adicione notas sobre o contexto</li>
                      <li>Clique em "Enviar" para ganhar 20 pontos</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      O destinatário pode atualizar o status da indicação conforme o andamento do contato.
                    </p>
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

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Negócios"</li>
                      <li>Clique em "Registrar Negócio"</li>
                      <li>Preencha: Nome do cliente, Valor (R$), Data, Descrição</li>
                      <li>Se o negócio veio de uma indicação, selecione o membro que indicou</li>
                      <li>Clique em "Salvar"</li>
                      <li>Você ganha 5 pontos a cada R$ 100,00</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Exemplo:</strong> Um negócio de R$ 5.000,00 = 250 pontos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Cases de Negócio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Registre cases vinculados a negócios fechados para destacar no seu perfil.</p>

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Primeiro, registre o negócio fechado em "Negócios"</li>
                      <li>No seu perfil, acesse a aba "Cases"</li>
                      <li>Clique em "Novo Case"</li>
                      <li>Preencha: Título, Descrição do case, Resultado obtido, Cliente</li>
                      <li>Vincule ao negócio fechado correspondente</li>
                      <li>Adicione uma imagem (opcional)</li>
                      <li>Clique em "Salvar"</li>
                    </ol>

                    <h4 className="font-semibold mt-4">Pontuação:</h4>
                    <ul>
                      <li><strong>Autor do case:</strong> +15 pontos</li>
                      <li><strong>Membro que indicou o negócio:</strong> +20 pontos</li>
                    </ul>

                    <p className="text-sm text-muted-foreground mt-2">
                      Os cases aparecem como cards no seu perfil (slider automático) e no feed de atividades.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      Conselho 24/7
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Help desk interno da comunidade. Poste problemas de negócio e receba ajuda de colegas.</p>

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Conselho 24/7"</li>
                      <li>Clique em "Novo Tópico" para criar uma dúvida ou questão</li>
                      <li>Preencha título e descrição do problema</li>
                      <li>Outros membros podem responder com sugestões</li>
                      <li>Marque a "Melhor Resposta" quando encontrar a solução ideal</li>
                      <li>Altere o status: Aberto → Em Andamento → Resolvido</li>
                    </ol>

                    <h4 className="font-semibold mt-4">Pontuação:</h4>
                    <ul>
                      <li><strong>Quem responde:</strong> +5 pontos por resposta</li>
                      <li><strong>Melhor resposta:</strong> +5 pontos adicionais</li>
                      <li><strong>Quem cria o tópico:</strong> não pontua</li>
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

                    <h4 className="font-semibold mt-4">Como usar:</h4>
                    <ol>
                      <li>Acesse o menu "Convites"</li>
                      <li>Clique em "Criar Novo Convite"</li>
                      <li>Preencha nome e email do convidado</li>
                      <li>Copie o link e envie por WhatsApp, email ou outro meio</li>
                      <li>O convidado criará sua conta e será adicionado como "Convidado"</li>
                      <li>Quando participar do primeiro encontro, você ganha 15 pontos</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Importante:</strong> Convites expiram em 30 dias. Você pode excluir convites pendentes antes da expiração.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Perfil v3
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Seu perfil é organizado em abas para melhor visualização:</p>
                    <ul>
                      <li><strong>Sobre:</strong> Informações pessoais, empresa, bio, tags/habilidades, "O que faço", "Cliente ideal" e "Como me indicar"</li>
                      <li><strong>Atividades:</strong> Histórico de Gente em Ação, Depoimentos, Indicações e Negócios</li>
                      <li><strong>Estatísticas:</strong> Pontos mensais, evolução e gráficos</li>
                      <li><strong>Cases:</strong> Cases de negócio (slider de cards)</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Gerador de Pitch via IA</h4>
                    <p className="text-sm text-muted-foreground">
                      Utilize a ferramenta de pitch para gerar automaticamente um texto de apresentação profissional 
                      baseado nas informações do seu perfil. Ideal para usar em encontros e apresentações.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rss className="h-5 w-5" />
                      Feed de Atividades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Acompanhe todas as ações da comunidade em tempo real na página <strong>/feed</strong>.</p>
                    <h4 className="font-semibold mt-4">Filtros disponíveis:</h4>
                    <ul>
                      <li><strong>Tipo:</strong> Gente em Ação, Depoimento, Negócio, Indicação, Presença, Convite, Conselho</li>
                      <li><strong>Período:</strong> Este mês, mês passado, últimos 3/6 meses ou todo o período</li>
                      <li><strong>Grupo:</strong> Filtre atividades por grupo específico</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique em qualquer atividade para ver os detalhes completos.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Navegação Mobile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>No celular, use a barra de navegação inferior para acessar rapidamente as funções mais usadas.</p>
                    <p className="text-sm text-muted-foreground">
                      Os atalhos mudam automaticamente conforme seu perfil (Membro, Admin ou Facilitador).
                    </p>
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
                      Administradores têm acesso completo ao sistema, incluindo gestão de grupos, 
                      membros, encontros, conteúdos e registros de atividades. O admin não pontua 
                      na gamificação e possui visão de gestão centralizada.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gerenciamento de Grupos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <h4 className="font-semibold">Funcionalidades:</h4>
                    <ul>
                      <li><strong>Criar Grupos:</strong> Nome, descrição e cor identificadora</li>
                      <li><strong>Adicionar Membros:</strong> Vincule membros aos grupos</li>
                      <li><strong>Promover Facilitadores:</strong> Defina líderes de cada grupo</li>
                      <li><strong>Remover Membros:</strong> Desvincule membros de grupos</li>
                      <li><strong>Promover Convidados:</strong> Transforme convidados em membros</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Como criar um grupo:</h4>
                    <ol>
                      <li>Acesse o menu "Grupos"</li>
                      <li>Clique em "Novo Grupo"</li>
                      <li>Preencha nome, descrição e cor</li>
                      <li>Adicione membros e promova facilitadores</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Gestão de Pessoas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                      A página unificada de Gestão de Pessoas (/admin/pessoas) centraliza todas as operações 
                      de gerenciamento de membros, convidados e histórico de inativos.
                    </p>

                    <h4 className="font-semibold mt-4">Aba Membros:</h4>
                    <ul>
                      <li>Lista todos os membros ativos (Membro, Facilitador, Admin)</li>
                      <li>Botão "Desativar" para mover para histórico de inativos</li>
                      <li>Ao desativar, o membro é removido de todos os grupos automaticamente</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Aba Convidados:</h4>
                    <ul>
                      <li>Lista pessoas que aceitaram convites mas não foram promovidas</li>
                      <li>Botão "Promover" para transformar em Membro ou Facilitador</li>
                      <li>Opção de adicionar a um grupo durante a promoção</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Aba Inativos:</h4>
                    <ul>
                      <li>Lista pessoas desativadas com data e motivo</li>
                      <li>Botão "Reativar" para trazer de volta</li>
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
                      <li>Criar/editar/excluir grupos e registros</li>
                      <li>Gestão CRUD de todos os registros (/admin/registros)</li>
                      <li>Não pontua na gamificação</li>
                      <li>Único lançamento: Conteúdos</li>
                    </ul>
                    <h4>Facilitador</h4>
                    <ul>
                      <li>Gerencia seu grupo (presenças, membros)</li>
                      <li>Pode realizar lançamentos, mas não pontua</li>
                      <li>Promover convidados a membros</li>
                      <li>Acessar Gestão de Convidados</li>
                    </ul>
                    <h4>Membro</h4>
                    <ul>
                      <li>Registrar atividades e pontuar</li>
                      <li>Criar convites e cases de negócio</li>
                      <li>Participar do Conselho 24/7</li>
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
                      <li><strong>Vincular a Grupos:</strong> Associe encontros a grupos específicos</li>
                      <li><strong>Acompanhar Presenças:</strong> Visualize quem confirmou presença</li>
                      <li><strong>Destaque "Em breve":</strong> Eventos nos próximos 7 dias recebem destaque visual</li>
                      <li><strong>Ordenação:</strong> Eventos ordenados por data (mais próximos primeiro)</li>
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
                    <p>Acompanhe métricas da comunidade no Dashboard (/dashboard):</p>
                    <ul>
                      <li>Total de membros e distribuição por rank</li>
                      <li>Valor total de negócios (acumulado e anual)</li>
                      <li>Quantidade de indicações e depoimentos</li>
                      <li><strong>% de presença por encontro</strong> (barras visuais)</li>
                      <li><strong>KPIs por grupo</strong> (membros, GA, indicações, depoimentos, volume R$)</li>
                      <li>Métricas de convites por membro</li>
                      <li>Ranking de membros mais ativos</li>
                      <li>Evolução mensal das atividades</li>
                      <li>Feed de atividades em tempo real</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Gestão de Registros (/admin/registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>O admin possui CRUD total sobre todos os registros do sistema:</p>
                    <ul>
                      <li>Gente em Ação — visualização e exclusão de registros</li>
                      <li>Indicações — visualização e exclusão</li>
                      <li>Depoimentos — visualização e exclusão</li>
                      <li>Negócios — visualização e exclusão</li>
                      <li>Convites — visualização e exclusão</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Todos os registros podem ser filtrados por grupo, período e busca textual.
                    </p>
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
                      {[
                        { route: '/auth', desc: 'Login, cadastro e recuperação de senha' },
                        { route: '/', desc: 'Dashboard principal com feed de atividades' },
                        { route: '/feed', desc: 'Feed completo com filtros (tipo, período, grupo)' },
                        { route: '/perfil', desc: 'Perfil v3 com abas (Sobre, Atividades, Estatísticas, Cases) e pitch IA' },
                        { route: '/membros', desc: 'Diretório unificado de membros por grupo' },
                        { route: '/membro/:slug', desc: 'Perfil individual com URL amigável e abas' },
                        { route: '/aniversarios', desc: 'Calendário de aniversários da comunidade' },
                        { route: '/ranking', desc: 'Ranking mensal por grupo' },
                        { route: '/gente-em-acao', desc: 'Registro de reuniões 1-a-1' },
                        { route: '/depoimentos', desc: 'Envio e visualização de depoimentos' },
                        { route: '/indicacoes', desc: 'Indicações com status (frio/morno/quente)' },
                        { route: '/negocios', desc: 'Registro de negócios fechados' },
                        { route: '/encontros', desc: 'Encontros ordenados com destaque "Em breve"' },
                        { route: '/convites', desc: 'Convites com expiração 30d e exclusão manual' },
                        { route: '/conselho', desc: 'Conselho 24/7 — help desk Kanban' },
                        { route: '/equipes', desc: 'Redireciona para /membros?tab=grupos' },
                        { route: '/estatisticas', desc: 'Gráficos e métricas do sistema' },
                        { route: '/conteudos', desc: 'Materiais educativos' },
                        { route: '/dashboard', desc: 'Dashboard Admin com KPIs' },
                        { route: '/admin', desc: 'Painel administrativo' },
                        { route: '/admin/pessoas', desc: 'Gestão de Membros/Convidados/Inativos' },
                        { route: '/admin/registros', desc: 'Gestão CRUD de registros (Admin)' },
                        { route: '/admin/convidados', desc: 'Gestão de convidados por encontro' },
                        { route: '/configuracoes', desc: 'Configurações e preferências de notificação' },
                        { route: '/documentacao', desc: 'Documentação do sistema (filtrada por role)' },
                        { route: '/changelog', desc: 'Histórico de versões e atualizações' },
                        { route: '/instalar', desc: 'Instruções de instalação PWA' },
                        { route: '/convite/:code', desc: 'Página pública de convite' },
                        { route: '/convite/:code/cadastrar', desc: 'Cadastro via convite (com Turnstile)' },
                      ].map(({ route, desc }) => (
                        <div key={route} className="p-3 rounded-lg bg-muted">
                          <code className="font-bold">{route}</code>
                          <p className="text-muted-foreground mt-1">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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
                      {[
                        { name: 'PasswordStrengthIndicator', desc: 'Indicador visual de força da senha' },
                        { name: 'PointsEvolutionChart', desc: 'Gráfico de evolução de pontos' },
                        { name: 'MonthlyPointsSummary', desc: 'Resumo de pontos mensais por grupo' },
                        { name: 'PointsHistoryCard', desc: 'Histórico de pontos no perfil' },
                        { name: 'RankBadge', desc: 'Badge visual do rank' },
                        { name: 'ActivityFeed', desc: 'Feed de atividades em tempo real' },
                        { name: 'MemberSelect', desc: 'Seletor de membros reutilizável' },
                        { name: 'ScoringRulesCard', desc: 'Regras de pontuação (inclui Conselho e Cases)' },
                        { name: 'AdminCacheDiagnostics', desc: 'Diagnóstico de cache do Cloudflare Worker Proxy' },
                        { name: 'AdminDataView', desc: 'Visualização admin com filtros e CRUD' },
                        { name: 'CloudflareTurnstile', desc: 'Widget anti-bot Cloudflare' },
                        { name: 'NotificationSettings', desc: 'Configurações de notificação por tipo' },
                        { name: 'OfflineIndicator', desc: 'Indicador de modo offline' },
                        { name: 'PWAInstallPrompt', desc: 'Prompt de instalação PWA' },
                      ].map(({ name, desc }) => (
                        <div key={name} className="p-3 rounded-lg bg-muted">
                          <code className="font-bold">{name}</code>
                          <p className="text-muted-foreground mt-1">{desc}</p>
                        </div>
                      ))}
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
                      {[
                        { label: 'Frontend', value: 'React + TypeScript + Vite' },
                        { label: 'Estilização', value: 'Tailwind CSS + Shadcn/UI' },
                        { label: 'Estado', value: 'React Query (TanStack Query)' },
                        { label: 'Roteamento', value: 'React Router DOM' },
                        { label: 'Gráficos', value: 'Recharts' },
                        { label: 'Forms', value: 'React Hook Form + Zod' },
                        { label: 'PWA', value: 'vite-plugin-pwa' },
                        { label: 'Backend', value: 'Supabase (Auth, DB, Edge Functions, Realtime)' },
                        { label: 'Cache de Borda', value: 'Cloudflare Worker Proxy (api.gentenetworking.com.br)' },
                        { label: 'Hosting', value: 'Cloudflare Pages' },
                        { label: 'Anti-Bot', value: 'Cloudflare Turnstile' },
                        { label: 'Analytics', value: 'Cloudflare Web Analytics' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-lg bg-muted">
                          <strong>{label}:</strong> {value}
                        </div>
                      ))}
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
                      {[
                        { table: 'profiles', desc: 'Perfis (nome, empresa, tags, what_i_do, ideal_client, how_to_refer_me)' },
                        { table: 'user_roles', desc: 'Roles (admin, facilitador, membro, convidado)' },
                        { table: 'teams', desc: 'Grupos de networking' },
                        { table: 'team_members', desc: 'Membros dos grupos' },
                        { table: 'meetings', desc: 'Encontros quinzenais' },
                        { table: 'attendances', desc: 'Presenças em encontros' },
                        { table: 'gente_em_acao', desc: 'Reuniões 1-a-1' },
                        { table: 'testimonials', desc: 'Depoimentos' },
                        { table: 'business_deals', desc: 'Negócios fechados' },
                        { table: 'business_cases', desc: 'Cases de negócio' },
                        { table: 'referrals', desc: 'Indicações (frio/morno/quente)' },
                        { table: 'council_posts', desc: 'Tópicos do Conselho 24/7' },
                        { table: 'council_replies', desc: 'Respostas no Conselho' },
                        { table: 'activity_feed', desc: 'Feed de atividades' },
                        { table: 'monthly_points', desc: 'Pontuação mensal por grupo' },
                        { table: 'points_history', desc: 'Histórico de pontos' },
                        { table: 'contents', desc: 'Conteúdos educativos' },
                        { table: 'invitations', desc: 'Convites de membros' },
                        { table: 'system_changelog', desc: 'Changelog do sistema' },
                      ].map(({ table, desc }) => (
                        <div key={table} className="p-2 rounded bg-muted flex justify-between">
                          <code>{table}</code>
                          <span className="text-muted-foreground text-xs">{desc}</span>
                        </div>
                      ))}
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
                      {[
                        { fn: 'send-email', desc: 'Envio de emails via Resend' },
                        { fn: 'send-notification', desc: 'Notificações de depoimentos, indicações, convites, boas-vindas' },
                        { fn: 'birthday-notifications', desc: 'Notificações automáticas de aniversários' },
                        { fn: 'verify-turnstile', desc: 'Verificação anti-bot Cloudflare Turnstile (server-side)' },
                      ].map(({ fn, desc }) => (
                        <div key={fn} className="p-3 rounded-lg bg-muted">
                          <code className="font-bold">{fn}</code>
                          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold mt-6">Arquitetura de Performance (Cloudflare Worker Proxy)</h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema utiliza um Cloudflare Worker como proxy reverso para cache de borda das requisições de leitura ao Supabase.
                      Isso reduz a latência e a carga no banco de dados.
                    </p>
                    <div className="grid gap-2 text-sm mt-3">
                      {[
                        { label: 'Proxy URL', value: 'api.gentenetworking.com.br' },
                        { label: 'Cache TTL', value: '60s a 600s (stale-while-revalidate)' },
                        { label: 'Headers', value: 'X-Cache (HIT/MISS/BYPASS), X-Cache-TTL' },
                        { label: 'Implementação', value: 'JavaScript puro no Cloudflare Dashboard' },
                        { label: 'Diagnóstico', value: 'Componente AdminCacheDiagnostics no painel Admin' },
                        { label: 'Ativação', value: 'Via VITE_PROXY_URL no ambiente (opcional)' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-2 rounded bg-muted flex justify-between gap-2">
                          <strong className="shrink-0">{label}:</strong>
                          <span className="text-muted-foreground text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      <strong>Importante:</strong> O frontend utiliza um único cliente Supabase autenticado.
                      O proxy deve ser configurado como camada de infraestrutura transparente, sem criar um segundo
                      cliente no frontend, para evitar quebra de sessão RLS.
                    </p>
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
                      <li>Função <code>has_role()</code> com SECURITY DEFINER e <code>search_path</code> definido</li>
                      <li>Função <code>is_team_facilitator()</code> para validar facilitadores</li>
                      <li>Função <code>is_guest()</code> para validar convidados</li>
                      <li>Políticas específicas por ação (SELECT, INSERT, UPDATE, DELETE)</li>
                      <li>Admin tem CRUD total sobre todos os registros via RLS</li>
                      <li>Cloudflare Turnstile protege formulário de cadastro contra bots</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Hardening de Segurança (v1.4.1)</h4>
                    <ul>
                      <li>Todas as funções PostgreSQL possuem <code>SET search_path = public</code></li>
                      <li>Extensões <code>unaccent</code> e <code>pg_trgm</code> em schema <code>extensions</code></li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Rodapé e Metadados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                    <p>Todas as páginas públicas e internas incluem:</p>
                    <ul>
                      <li>Rodapé de copyright com marca Ranktop</li>
                      <li>Créditos de licenciamento visual (Freepik, Flaticon, FontAwesome, LottieFiles)</li>
                      <li>Meta tags de autoria no <code>index.html</code></li>
                      <li>Cloudflare Web Analytics (beacon) no <code>index.html</code></li>
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
