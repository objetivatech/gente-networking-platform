/**
 * matchmaking-rules - Regras determinísticas para oportunidades de conexão.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

export type MatchType = 'indicacao' | 'parceria' | 'troca_base' | 'segmento' | 'tags';

interface ProfileForOpportunity {
  what_i_do: string | null | undefined;
  ideal_client: string | null | undefined;
  business_segment: string | null | undefined;
  tags: string[];
}

export interface MatchOpportunity {
  matchType: MatchType;
  partnershipScore: number;
  opportunityTitle: string;
  opportunityDescription: string;
  opportunityIdeas: string[];
  serviceCategories: string[];
  sharedAudiences: string[];
}

interface ServiceCategory {
  id: string;
  label: string;
  keywords: string[];
}

interface ComplementaryRule {
  a: string;
  b: string;
  description: string;
  ideas: string[];
}

const normalize = (value: string | null | undefined): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const profileText = (profile: ProfileForOpportunity): string =>
  normalize([
    profile.what_i_do,
    profile.ideal_client,
    profile.business_segment,
    ...(profile.tags || []),
  ].filter(Boolean).join(' '));

const serviceCategories: ServiceCategory[] = [
  { id: 'seo', label: 'SEO', keywords: ['seo', 'organico', 'posicionamento', 'google', 'busca', 'conteudo', 'trafego organico'] },
  { id: 'marketing', label: 'Marketing', keywords: ['marketing', 'social media', 'midias sociais', 'campanha', 'comunicacao', 'publicidade'] },
  { id: 'trafego', label: 'Tráfego Pago', keywords: ['trafego pago', 'google ads', 'meta ads', 'ads', 'performance', 'anuncios'] },
  { id: 'design', label: 'Design', keywords: ['design', 'branding', 'marca', 'identidade visual', 'criativo', 'logotipo'] },
  { id: 'web', label: 'Desenvolvimento Web', keywords: ['site', 'web', 'sistema', 'software', 'aplicativo', 'app', 'programacao', 'desenvolvimento'] },
  { id: 'video', label: 'Vídeo e Conteúdo', keywords: ['video', 'filmagem', 'conteudo', 'audiovisual', 'foto', 'fotografia', 'podcast'] },
  { id: 'eventos', label: 'Eventos', keywords: ['evento', 'eventos', 'cerimonial', 'experiencia', 'palestra', 'workshop'] },
  { id: 'juridico', label: 'Jurídico', keywords: ['juridico', 'advocacia', 'advogado', 'contrato', 'lgpd', 'direito'] },
  { id: 'contabil', label: 'Contábil', keywords: ['contabil', 'contabilidade', 'fiscal', 'tributario', 'imposto', 'financeiro'] },
  { id: 'financeiro', label: 'Financeiro', keywords: ['financeiro', 'credito', 'investimento', 'seguros', 'seguro', 'planejamento financeiro'] },
  { id: 'rh', label: 'RH', keywords: ['rh', 'recursos humanos', 'recrutamento', 'selecao', 'gestao de pessoas', 'dp'] },
  { id: 'treinamento', label: 'Treinamento', keywords: ['treinamento', 'mentoria', 'consultoria', 'capacitacao', 'curso', 'educacao'] },
  { id: 'saude', label: 'Saúde', keywords: ['saude', 'clinica', 'odontologia', 'terapia', 'medico', 'bem estar'] },
  { id: 'imoveis', label: 'Imóveis', keywords: ['imovel', 'imoveis', 'corretor', 'construtora', 'arquitetura', 'engenharia'] },
  { id: 'vendas', label: 'Vendas', keywords: ['vendas', 'comercial', 'crm', 'prospeccao', 'negociacao', 'atendimento'] },
];

const complementaryRules: ComplementaryRule[] = [
  {
    a: 'seo', b: 'web',
    description: 'podem criar uma oferta conjunta de site preparado para captar leads e crescer no Google.',
    ideas: ['Mapear clientes com site fraco ou sem estratégia orgânica', 'Criar um pacote de site + SEO inicial', 'Trocar diagnósticos rápidos de oportunidades digitais'],
  },
  {
    a: 'seo', b: 'trafego',
    description: 'podem combinar aquisição orgânica e mídia paga para acelerar geração de demanda.',
    ideas: ['Separar clientes que precisam de resultado imediato e construção de longo prazo', 'Criar um plano integrado de captação', 'Comparar termos orgânicos com campanhas pagas ativas'],
  },
  {
    a: 'marketing', b: 'design',
    description: 'podem entregar presença digital com posicionamento, identidade e execução de campanhas.',
    ideas: ['Criar uma oferta de reposicionamento de marca', 'Unir calendário de conteúdo com peças visuais', 'Indicar clientes que precisam profissionalizar comunicação'],
  },
  {
    a: 'marketing', b: 'video',
    description: 'podem transformar estratégia comercial em conteúdo audiovisual para atrair clientes.',
    ideas: ['Planejar campanhas com vídeos curtos', 'Criar pacote de conteúdo para lançamentos', 'Trocar clientes que precisam melhorar autoridade'],
  },
  {
    a: 'juridico', b: 'contabil',
    description: 'podem apoiar empresas em regularização, contratos, estrutura societária e gestão fiscal.',
    ideas: ['Mapear clientes em abertura ou reorganização de empresa', 'Criar checklist jurídico-contábil', 'Indicar demandas de contrato, fiscal e enquadramento'],
  },
  {
    a: 'rh', b: 'treinamento',
    description: 'podem unir diagnóstico de pessoas com desenvolvimento de líderes e equipes.',
    ideas: ['Criar trilha de desenvolvimento para empresas atendidas', 'Trocar demandas de recrutamento e capacitação', 'Ofertar diagnóstico de clima + treinamento'],
  },
  {
    a: 'financeiro', b: 'contabil',
    description: 'podem ajudar empresas a organizar números, impostos, caixa e planejamento financeiro.',
    ideas: ['Mapear clientes com dor de caixa ou tributação', 'Criar rotina de indicadores financeiros', 'Trocar oportunidades de planejamento e organização contábil'],
  },
  {
    a: 'eventos', b: 'video',
    description: 'podem oferecer produção de experiência presencial com registro e conteúdo pós-evento.',
    ideas: ['Criar pacote de evento + cobertura audiovisual', 'Indicar clientes com eventos corporativos', 'Transformar encontros em conteúdo para redes sociais'],
  },
  {
    a: 'imoveis', b: 'juridico',
    description: 'podem apoiar clientes em transações imobiliárias com mais segurança documental e contratual.',
    ideas: ['Trocar demandas de compra, venda e locação', 'Criar checklist jurídico para imóveis', 'Indicar clientes que precisam validar contratos'],
  },
  {
    a: 'vendas', b: 'marketing',
    description: 'podem conectar geração de demanda com processo comercial para aumentar conversão.',
    ideas: ['Revisar jornada lead → venda', 'Criar campanha com roteiro comercial', 'Trocar clientes que têm leads, mas baixa conversão'],
  },
];

const audienceKeywords = [
  'clinica', 'clinicas', 'empresa', 'empresas', 'empreendedor', 'empreendedores', 'industria', 'industrias',
  'varejo', 'loja', 'lojas', 'imobiliaria', 'imobiliarias', 'advogado', 'advogados', 'medico', 'medicos',
  'dentista', 'dentistas', 'restaurante', 'restaurantes', 'startup', 'startups', 'condominio', 'condominios',
  'escola', 'escolas', 'profissional liberal', 'profissionais liberais', 'gestor', 'gestores', 'b2b', 'b2c',
];

const inferCategories = (profile: ProfileForOpportunity): ServiceCategory[] => {
  const text = profileText(profile);
  return serviceCategories.filter((category) =>
    category.keywords.some((keyword) => text.includes(normalize(keyword)))
  );
};

const sharedAudience = (a: ProfileForOpportunity, b: ProfileForOpportunity): string[] => {
  const aText = normalize([a.ideal_client, a.what_i_do, a.business_segment].filter(Boolean).join(' '));
  const bText = normalize([b.ideal_client, b.what_i_do, b.business_segment].filter(Boolean).join(' '));
  return audienceKeywords.filter((keyword) => aText.includes(normalize(keyword)) && bText.includes(normalize(keyword)));
};

const findComplementaryRule = (mine: ServiceCategory[], other: ServiceCategory[]) => {
  for (const myCategory of mine) {
    for (const otherCategory of other) {
      const rule = complementaryRules.find(
        (candidate) =>
          (candidate.a === myCategory.id && candidate.b === otherCategory.id) ||
          (candidate.a === otherCategory.id && candidate.b === myCategory.id)
      );
      if (rule && myCategory.id !== otherCategory.id) {
        return { rule, myCategory, otherCategory };
      }
    }
  }
  return null;
};

export function analyzeMatchOpportunity(
  myProfile: ProfileForOpportunity,
  otherProfile: ProfileForOpportunity,
  context: { hasIdealClientFit: boolean; hasSameSegment: boolean; hasSharedTags: boolean }
): MatchOpportunity {
  const mine = inferCategories(myProfile);
  const other = inferCategories(otherProfile);
  const audiences = sharedAudience(myProfile, other);
  const complementary = findComplementaryRule(mine, other);

  if (complementary) {
    return {
      matchType: 'parceria',
      partnershipScore: 30 + (audiences.length > 0 ? 10 : 0),
      opportunityTitle: 'Parceria complementar',
      opportunityDescription: `${complementary.myCategory.label} + ${complementary.otherCategory.label} ${complementary.rule.description}`,
      opportunityIdeas: complementary.rule.ideas,
      serviceCategories: Array.from(new Set([...mine, ...other].map((category) => category.label))),
      sharedAudiences: audiences,
    };
  }

  if (audiences.length > 0 && mine.length > 0 && other.length > 0) {
    return {
      matchType: 'troca_base',
      partnershipScore: 20,
      opportunityTitle: 'Troca de base compatível',
      opportunityDescription: `Vocês atendem públicos parecidos (${audiences.slice(0, 2).join(', ')}) com soluções diferentes, o que pode gerar troca qualificada de contatos.`,
      opportunityIdeas: ['Comparar perfis de clientes atendidos', 'Listar clientes que precisam de serviços complementares', 'Fazer uma apresentação cruzada para oportunidades ativas'],
      serviceCategories: Array.from(new Set([...mine, ...other].map((category) => category.label))),
      sharedAudiences: audiences,
    };
  }

  if (context.hasIdealClientFit) {
    return {
      matchType: 'indicacao',
      partnershipScore: 10,
      opportunityTitle: 'Indicação estratégica',
      opportunityDescription: 'O perfil indica potencial para apresentar clientes ou oportunidades alinhadas ao cliente ideal informado.',
      opportunityIdeas: ['Trocar exemplos de cliente ideal', 'Mapear contatos que se encaixam no perfil buscado', 'Combinar uma apresentação objetiva entre as partes'],
      serviceCategories: Array.from(new Set([...mine, ...other].map((category) => category.label))),
      sharedAudiences: audiences,
    };
  }

  if (context.hasSameSegment) {
    return {
      matchType: 'segmento',
      partnershipScore: 5,
      opportunityTitle: 'Afinidade de segmento',
      opportunityDescription: 'Há proximidade de segmento, útil para troca de repertório, benchmark e possíveis indicações internas.',
      opportunityIdeas: ['Trocar aprendizados do segmento', 'Identificar demandas recorrentes dos clientes', 'Avaliar oportunidades que não geram concorrência direta'],
      serviceCategories: Array.from(new Set([...mine, ...other].map((category) => category.label))),
      sharedAudiences: audiences,
    };
  }

  return {
    matchType: 'tags',
    partnershipScore: context.hasSharedTags ? 5 : 0,
    opportunityTitle: context.hasSharedTags ? 'Afinidade por interesses' : 'Conexão exploratória',
    opportunityDescription: context.hasSharedTags
      ? 'As tags em comum indicam temas próximos para iniciar uma conversa de conexão.'
      : 'Complete mais dados de perfil para gerar hipóteses de parceria mais precisas.',
    opportunityIdeas: context.hasSharedTags
      ? ['Conversar sobre as tags em comum', 'Identificar clientes com dores parecidas', 'Registrar próximos passos após a primeira conversa']
      : ['Completar perfil', 'Adicionar cliente ideal', 'Adicionar tags de especialidade'],
    serviceCategories: Array.from(new Set([...mine, ...other].map((category) => category.label))),
    sharedAudiences: audiences,
  };
}