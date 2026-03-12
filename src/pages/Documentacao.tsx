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
                      <p className="font-semibold text-primary">Novidade v2.3.0!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Os pontos agora são contabilizados <strong>mensalmente</strong> e por <strong>grupo</strong>. 
                        A cada novo mês, o ranking reinicia, dando oportunidade para todos competirem novamente!
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
                        <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Depoimentos</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Indicações</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Presenças</span>
                        <Badge>20 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Convites Aceitos</span>
                        <Badge>15 pts</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Negócios</span>
                        <Badge>5 pts / R$100</Badge>
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
                      <li>Escreva um depoimento sincero destacando qualidades profissionais, trabalhos realizados ou experiências positivas</li>
                      <li>Clique em "Enviar" para ganhar 15 pontos</li>
                      <li>O membro receberá uma notificação por email e o depoimento aparecerá no perfil dele</li>
                    </ol>

                    <p className="text-sm text-muted-foreground mt-4">
                      <strong>Nota:</strong> Você só pode enviar depoimentos para membros do mesmo grupo.
                    </p>
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
                      <li>Selecione o membro do seu grupo que receberá a indicação</li>
                      <li>Preencha os dados do contato:
                        <ul>
                          <li>Nome completo</li>
                          <li>Telefone (WhatsApp)</li>
                          <li>Email</li>
                        </ul>
                      </li>
                      <li>Adicione notas sobre o contexto da indicação, necessidades do contato ou como conheceu a pessoa</li>
                      <li>Clique em "Enviar" para ganhar 20 pontos</li>
                      <li>O membro receberá uma notificação por email com os dados do contato</li>
                    </ol>

                    <p className="text-sm text-muted-foreground mt-4">
                      <strong>Nota:</strong> Você só pode fazer indicações para membros do mesmo grupo.
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
                      <li>Preencha os dados:
                        <ul>
                          <li>Nome do cliente</li>
                          <li>Valor do negócio em R$</li>
                          <li>Data de fechamento</li>
                          <li>Descrição do negócio (opcional)</li>
                        </ul>
                      </li>
                      <li>Se o negócio veio de uma indicação, selecione o membro que fez a indicação</li>
                      <li>Clique em "Salvar"</li>
                      <li>Você ganha 5 pontos a cada R$ 100,00 do valor do negócio</li>
                    </ol>

                    <p className="text-sm text-muted-foreground mt-4">
                      <strong>Exemplo:</strong> Um negócio de R$ 5.000,00 = 250 pontos
                    </p>
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
                      <li>Preencha:
                        <ul>
                          <li>Nome do convidado</li>
                          <li>Email do convidado</li>
                        </ul>
                      </li>
                      <li>Clique em "Gerar Convite"</li>
                      <li>Copie o link gerado e envie para o convidado por WhatsApp, email ou outro meio</li>
                      <li>O convidado clicará no link, criará sua conta e será adicionado como "Convidado"</li>
                      <li>Quando o convidado participar do primeiro encontro presencial, você ganha 15 pontos</li>
                      <li>Um administrador ou facilitador precisará promovê-lo para "Membro" após o primeiro encontro</li>
                    </ol>

                    <p className="text-sm text-muted-foreground mt-4">
                      <strong>Importante:</strong> Convites expiram em 30 dias. Você pode acompanhar o status de todos os seus convites na página de Convites.
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
                      Administradores têm acesso completo ao sistema, podendo gerenciar grupos, 
                      membros, encontros e conteúdos.
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
                      <li>Preencha:
                        <ul>
                          <li>Nome do grupo</li>
                          <li>Descrição (opcional)</li>
                          <li>Escolha uma cor para identificação</li>
                        </ul>
                      </li>
                      <li>Clique em "Salvar"</li>
                      <li>Na lista de grupos, clique em "Gerenciar Membros"</li>
                      <li>Adicione membros ao grupo</li>
                      <li>Se necessário, promova um membro para Facilitador</li>
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

                    <h4 className="font-semibold mt-4">Acessando a Gestão de Pessoas:</h4>
                    <ol>
                      <li>No menu lateral, na seção Administração, clique em "Gestão de Pessoas"</li>
                      <li>Você verá três abas: Membros, Convidados e Inativos</li>
                      <li>Use os filtros para buscar por nome, email, perfil ou grupo</li>
                    </ol>

                    <h4 className="font-semibold mt-4">Aba Membros:</h4>
                    <ul>
                      <li>Lista todos os membros ativos (Membro, Facilitador, Admin)</li>
                      <li>Botão "Desativar" para mover para histórico de inativos</li>
                      <li>Ao desativar, o membro é automaticamente removido de todos os grupos</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Aba Convidados:</h4>
                    <ul>
                      <li>Lista pessoas que aceitaram convites mas ainda não foram promovidas</li>
                      <li>Mostra quem fez o convite e quando</li>
                      <li>Botão "Promover" para transformar em Membro ou Facilitador</li>
                      <li>Opção de adicionar diretamente a um grupo durante a promoção</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Aba Inativos:</h4>
                    <ul>
                      <li>Lista todas as pessoas desativadas (histórico)</li>
                      <li>Mostra data e motivo da desativação</li>
                      <li>Botão "Reativar" para trazer a pessoa de volta</li>
                      <li>Após reativar, é necessário adicionar ao grupo manualmente</li>
                    </ul>

                    <p className="text-sm text-muted-foreground mt-4">
                      <strong>Dica:</strong> Convites expiram em 30 dias. Convidados aceitos que não foram promovidos 
                      continuam com acesso limitado até serem promovidos.
                    </p>
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
                      <li>Criar/editar/excluir grupos</li>
                      <li>Definir facilitadores</li>
                      <li>Migrar membros entre grupos</li>
                      <li>Promover convidados a membros</li>
                    </ul>
                    <h4>Facilitador</h4>
                    <ul>
                      <li>Gerenciar apenas seu grupo</li>
                      <li>Promover convidados a membros</li>
                      <li>Adicionar apenas convidados ao grupo (para encontros)</li>
                      <li>Remover membros do seu grupo</li>
                      <li>Criar convites</li>
                      <li>Acessar Gestão de Convidados</li>
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
                      <li><strong>Vincular a Grupos:</strong> Associe encontros a grupos específicos</li>
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
                        <code className="font-bold">/membro/:slug</code>
                        <p className="text-muted-foreground mt-1">Perfil individual de membro com URL amigável (ex: /membro/joao-silva)</p>
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
                        <p className="text-muted-foreground mt-1">Gestão de grupos (Admin/Facilitador)</p>
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
                        <code className="font-bold">/admin/membros</code>
                        <p className="text-muted-foreground mt-1">Gerenciamento de membros ativos/inativos (apenas Admin)</p>
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
                        <span className="text-muted-foreground text-xs">Grupos de networking</span>
                      </div>
                      <div className="p-2 rounded bg-muted flex justify-between">
                        <code>team_members</code>
                        <span className="text-muted-foreground text-xs">Membros dos grupos</span>
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
                        <code className="font-bold">birthday-notifications</code>
                        <p className="text-sm text-muted-foreground mt-1">Notificações automáticas de aniversários</p>
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
                      <li>Função <code>has_role()</code> com SECURITY DEFINER e <code>search_path</code> definido</li>
                      <li>Função <code>is_team_facilitator()</code> para validar facilitadores</li>
                      <li>Função <code>is_guest()</code> para validar convidados</li>
                      <li>Políticas específicas por ação (SELECT, INSERT, UPDATE, DELETE)</li>
                      <li>Facilitadores só podem adicionar convidados aos seus grupos</li>
                    </ul>

                    <h4 className="font-semibold mt-4">Hardening de Segurança (v1.4.1)</h4>
                    <ul>
                      <li>Todas as funções PostgreSQL possuem <code>SET search_path = public</code> para evitar hijacking de search path</li>
                      <li>Extensões <code>unaccent</code> e <code>pg_trgm</code> movidas para schema <code>extensions</code> dedicado</li>
                      <li>Funções que usam extensões definem <code>search_path = public, extensions</code></li>
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
                      <li>Cabeçalhos JSDoc em arquivos core do sistema</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Páginas públicas com rodapé: Login, Cadastro de Convidado, Redefinir Senha, Instalar, Convite Público.
                    </p>
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
