/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import type { AppRole } from './access-control';
export type GuideStep = { title: string; text: string };
const pages: Record<string, [string, string, string]> = {
  '/': ['Sua rede começa aqui', 'Acompanhe as possibilidades de relacionamento disponíveis para seu papel e plano.', 'Escolha uma próxima conversa ou consulte os encontros da sua agenda.'],
  '/perfil': ['Seu perfil abre portas', 'Apresente o que faz, seu cliente ideal e como pode ser indicado. Preencha também as portas que abro e procuro.', 'Informações completas ajudam outras pessoas a conhecer seu trabalho e encontrar afinidades. Pitch por IA é opcional; cartão e página pública dependem do acesso autorizado.'],
  '/vitrine': ['Vitrine Gente Conexões', 'Conheça Assinantes e Convidados ativos, sem acesso ao diretório de Membros por esta Vitrine.', 'Use os filtros, veja perfis e inicie uma conversa. A ordem padrão considera completude e compatibilidade.'],
  '/membros': ['Conheça seu Grupo', 'Descubra o trabalho e os públicos dos Membros para construir indicações mais relevantes.', 'Abra um perfil e procure uma possibilidade concreta de parceria antes de iniciar a conversa.'],
  '/matchmaking': ['Conexões com propósito', 'As sugestões cruzam perfis e portas de conexão; pessoas da mesma área também podem colaborar.', 'A sugestão semanal não consome franquia. Sorteios extras seguem os limites do plano; conhecer alguém não registra uma conexão automaticamente.'],
  '/encontros': ['Relacionamentos em encontro', 'Consulte a agenda e os detalhes de cada evento. Confirmação de participação não equivale a presença registrada.', 'Prepare uma apresentação objetiva e mantenha contato com quem conhecer. Convites e confirmações seguem as permissões do encontro.'],
  '/gente-em-acao': ['Aprofunde uma conexão', 'Uma conversa individual ajuda a conhecer o trabalho, os objetivos e os públicos de outra pessoa.', 'Combine o encontro e registre somente o que aconteceu. A disponibilidade de agendamento depende do plano.'],
  '/indicacoes': ['Indique com contexto', 'Uma boa indicação aproxima uma necessidade real de quem pode atendê-la.', 'Descreva a oportunidade e acompanhe o retorno. Evite compartilhar informações pessoais sem autorização.'],
  '/negocios': ['Acompanhe resultados', 'Registre negócios que nasceram dos relacionamentos e indicações.', 'Mantenha os dados e o vínculo da oportunidade corretos para preservar os indicadores do Grupo.'],
  '/convites': ['Amplie a rede do Gente', 'Convide pessoas que podem somar ao Grupo. Reconvidar não exige criar outra conta.', 'Membros atuam nos seus Grupos; Facilitadores gerenciam os Grupos sob sua responsabilidade e Admins têm escopo global. A autoria original é preservada.'],
  '/convidados': ['Acolha quem está chegando', 'Conheça os Convidados dentro do seu escopo e acompanhe suas participações.', 'Ajude cada pessoa a entender a dinâmica do Grupo e a encontrar uma primeira conexão.'],
  '/conselho': ['Conte com a experiência da rede', 'Compartilhe uma questão para receber contribuições de outros participantes.', 'Contextualize o desafio e preserve informações confidenciais de clientes e parceiros.'],
  '/oportunidades': ['Compartilhe possibilidades', 'Encontre ou publique oportunidades relevantes para sua rede.', 'Use informações objetivas para facilitar o contato e a avaliação de quem pode colaborar.'],
  '/pedidos-indicacao': ['Mobilize a rede', 'Explique quem procura e qual necessidade deseja atender.', 'Pedidos claros ajudam as pessoas a reconhecer contatos que podem abrir a porta certa.'],
  '/depoimentos': ['Reconheça experiências reais', 'Compartilhe experiências sobre o trabalho de quem você conhece.', 'Relatos específicos fortalecem a confiança; registre apenas o que pode confirmar.'],
  '/feed': ['Acompanhe a rede em movimento', 'Veja as atividades disponíveis no seu escopo de acesso.', 'Use os registros para reconhecer contribuições e retomar conversas relevantes.'],
  '/conteudos': ['Aprenda para conectar melhor', 'Consulte os materiais disponíveis para sua participação.', 'Leve uma ideia para a próxima conversa e transforme aprendizado em relacionamento.'],
  '/estatisticas': ['Entenda a participação', 'Observe os indicadores no período e no escopo selecionados.', 'Compare as mesmas populações antes de tomar decisões; presença, convite e confirmação são informações diferentes.'],
  '/ranking': ['Reconheça contribuições', 'Acompanhe a participação conforme as regras de gamificação.', 'Priorize relações úteis e registros verdadeiros, não ações apenas para aumentar pontos.'],
  '/admin/pessoas': ['Cuide da participação', 'Papéis, planos e assinaturas são informações diferentes.', 'Revise a pessoa antes de alterar acesso ou reconvidar; histórico e autoria devem ser preservados.'],
  '/admin/planos': ['Planos e relacionamentos', 'Configure módulos, franquias, vagas, selos e teste gratuito por oferta.', 'Em Contratações pendentes, retome o contato manualmente sem gerar outra cobrança. Ativar um plano não altera o papel das pessoas.'],
  '/admin/crm': ['Acompanhe a jornada de entrada', 'Organize os cadastros e suas origens sem duplicar identidades.', 'A recuperação de contratações fica separada das etapas do CRM; contato manual não altera presença, pontos ou papel.'],
  '/admin/acolhimento': ['Prepare o primeiro acesso', 'Configure o vídeo de boas-vindas do Gente Conexões.', 'A conclusão é individual e por versão; valide o arquivo antes de habilitar a obrigatoriedade.'],
  '/admin/conexoes': ['Organize as portas de conexão', 'Decisores e setores ajudam a identificar pontes entre profissionais.', 'Desative opções sem apagar o histórico de quem já as selecionou.'],
  '/configuracoes': ['Cuide da sua conta', 'Revise suas preferências e os controles disponíveis para sua conta.', 'Mantenha os canais de contato atualizados para continuar as conversas com segurança.'],
};
export function getContextualGuide(path: string, role: AppRole): GuideStep[] {
  const key = path.replace(/\/+$/, '') || '/';
  const [title, purpose, action] = pages[key] ?? (key.startsWith('/admin/lps') ? ['Páginas que acolhem novas conexões', 'Edite a apresentação e os formulários no gerenciador de LPs.', 'Preserve origem, destino e condições das ofertas; os formulários seguem o fluxo único do CRM.'] : key.startsWith('/membro/') ? ['Conheça esta pessoa', 'Entenda seu trabalho e as portas que pode abrir.', 'Procure uma parceria que faça sentido para ambas as pessoas.'] : ['Conexões com continuidade', 'Esta página faz parte da sua jornada de relacionamento no Gente.', 'Use os recursos disponíveis para seu papel e plano, preservando o contexto e a privacidade das pessoas.']);
  let scope = role === 'admin' ? 'Sua visão administrativa permite gestão global; Admin não recebe pontos.' : role === 'facilitador' ? 'Atue nos Grupos sob sua responsabilidade; Facilitadores não recebem pontos.' : role === 'assinante' ? 'Seu acesso segue o plano Gente Conexões. Grupos Premium exigem contratação própria.' : role === 'convidado' ? 'Como Convidado, você não acessa a Vitrine nem o diretório de Membros.' : 'Seu papel e plano determinam os recursos e o universo de pessoas disponíveis.';
  if (key === '/encontros' && role === 'assinante') scope = 'Para confirmar qualquer evento, inclusive Gente HUB, é necessário convite específico. A assinatura não registra presença automaticamente.';
  if (key === '/encontros' && role === 'convidado') scope = 'Gente HUB permite inscrição; encontros Premium exigem convite autorizado. Confirmar não registra presença automaticamente.';
  return [{ title, text: purpose }, { title: 'Transforme em uma próxima conexão', text: action }, { title: 'Seu acesso e sua participação', text: scope }];
}
export function canAutoStartGuide(videoBlocked: boolean, profileComplete: boolean, otherDialog: boolean, seen: boolean, profileDeferred = false) {
  return !videoBlocked && (profileComplete || profileDeferred) && !otherDialog && !seen;
}
export function needsProfilePrompt(ready: boolean, complete: boolean, missingKey: string, deferredKey: string) {
  return ready && !complete && missingKey !== deferredKey;
}