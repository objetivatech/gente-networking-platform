/**
 * Política de Cookies — Gente Comunidade (v3.28.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function PoliticaCookies() {
  const updated = '22 de julho de 2026';

  const resetConsent = () => {
    try {
      localStorage.removeItem('gente:lgpd-consent:v1');
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Helmet>
        <title>Política de Cookies — Gente Comunidade</title>
        <meta
          name="description"
          content="Como a Gente Comunidade utiliza cookies e tecnologias similares, conforme a LGPD."
        />
        <link
          rel="canonical"
          href="https://comunidade.gentenetworking.com.br/politica-de-cookies"
        />
      </Helmet>
      <main className="min-h-screen bg-background">
        <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm sm:prose-base dark:prose-invert">
          <p className="text-xs text-muted-foreground">Última atualização: {updated}</p>
          <h1>Política de Cookies</h1>
          <p>
            Esta Política explica como usamos cookies e tecnologias similares (localStorage,
            sessionStorage, service worker) na plataforma <strong>Gente Comunidade</strong>. O
            uso desses recursos observa a LGPD e complementa a{' '}
            <Link to="/politica-de-privacidade" className="text-primary underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <h2>Categorias</h2>
          <ul>
            <li>
              <strong>Essenciais</strong> — necessários para autenticação, segurança, preferências
              de sessão, PWA e navegação. Não podem ser desativados.
            </li>
            <li>
              <strong>Analíticos</strong> — métricas agregadas de uso para melhoria de produto.
              Ativados apenas com consentimento.
            </li>
            <li>
              <strong>Marketing</strong> — atualmente não utilizamos cookies de marketing
              próprios; caso passemos a utilizá-los, exigiremos consentimento específico.
            </li>
          </ul>

          <h2>Principais itens</h2>
          <table>
            <thead>
              <tr>
                <th>Chave</th>
                <th>Categoria</th>
                <th>Finalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>sb-*-auth-token</td>
                <td>Essencial</td>
                <td>Sessão de autenticação Supabase.</td>
              </tr>
              <tr>
                <td>gente:sidebar-groups:v1</td>
                <td>Essencial</td>
                <td>Estado do menu lateral.</td>
              </tr>
              <tr>
                <td>gente:lgpd-consent:v1</td>
                <td>Essencial</td>
                <td>Registro do seu consentimento.</td>
              </tr>
              <tr>
                <td>gente:pwa-prompt:v1</td>
                <td>Essencial</td>
                <td>Controle do popup de instalação.</td>
              </tr>
            </tbody>
          </table>

          <h2>Gerenciar preferências</h2>
          <p>
            Você pode alterar seu consentimento a qualquer momento clicando no botão abaixo. Isso
            reabrirá o banner e permitirá uma nova escolha.
          </p>
          <p>
            <Button size="sm" variant="outline" onClick={resetConsent}>
              Rever consentimento de cookies
            </Button>
          </p>

          <h2>Bloqueio no navegador</h2>
          <p>
            Você também pode configurar seu navegador para bloquear cookies. Note que o bloqueio
            de cookies essenciais pode impedir o login e o uso adequado da Plataforma.
          </p>

          <hr />
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Modelo editável. Ajuste categorias, prazos e chaves de acordo
            com as tecnologias em uso na versão vigente da plataforma.
          </p>
        </article>
      </main>
    </>
  );
}
