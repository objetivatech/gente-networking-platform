/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
const PLATFORM_PATHS = new Set(['auth', 'instalar', 'perfil', 'feed', 'membros', 'matchmaking', 'oportunidades', 'pedidos-indicacao', 'convidados', 'aniversarios', 'estatisticas', 'gente-em-acao', 'depoimentos', 'negocios', 'indicacoes', 'equipes', 'encontros', 'conteudos', 'ranking', 'convites', 'conselho', 'changelog', 'documentacao', 'configuracoes', 'dashboard', 'admin', 'vitrine', 'membro']);
export function canShowPlatformInstall(hostname: string, pathname: string): boolean {
  if (hostname.toLowerCase() === 'lps.gentenetworking.com.br') return false;
  return pathname === '/' || PLATFORM_PATHS.has(pathname.split('/').filter(Boolean)[0] ?? '');
}