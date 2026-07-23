/**
 * Política de Privacidade — Gente Comunidade (v3.28.0).
 * Modelo aderente à LGPD (Lei 13.709/2018). Revisar com jurídico antes de produção.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function PoliticaPrivacidade() {
  const updated = '22 de julho de 2026';
  return (
    <>
      <Helmet>
        <title>Política de Privacidade — Gente Comunidade</title>
        <meta
          name="description"
          content="Como coletamos, tratamos e protegemos dados pessoais na plataforma Gente Comunidade, em conformidade com a LGPD."
        />
        <link
          rel="canonical"
          href="https://comunidade.gentenetworking.com.br/politica-de-privacidade"
        />
      </Helmet>
      <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm sm:prose-base dark:prose-invert">
          <p className="text-xs text-muted-foreground">Última atualização: {updated}</p>
          <h1>Política de Privacidade</h1>
          <p>
            Esta Política descreve como a plataforma <strong>Gente Comunidade</strong> ("Plataforma")
            trata dados pessoais dos seus usuários, em observância à{' '}
            <strong>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong>, ao Marco
            Civil da Internet (Lei 12.965/2014) e ao Código de Defesa do Consumidor.
          </p>

          <h2>1. Controlador e Encarregado (DPO)</h2>
          <p>
            <strong>Controlador:</strong> Gente Networking. <br />
            <strong>Encarregado pelo tratamento de dados:</strong>{' '}
            <a href="mailto:dpo@gentenetworking.com.br">dpo@gentenetworking.com.br</a>.
          </p>

          <h2>2. Dados que tratamos</h2>
          <ul>
            <li>
              <strong>Cadastro:</strong> nome, e-mail, telefone, empresa, cargo, segmento,
              foto, bio, redes sociais, aniversário.
            </li>
            <li>
              <strong>Atividade na Plataforma:</strong> presenças, indicações, negócios,
              depoimentos, pontuação, publicações no feed/conselho, mensagens internas.
            </li>
            <li>
              <strong>Técnicos:</strong> IP, tipo de dispositivo, navegador, logs de acesso
              (retidos conforme o Marco Civil).
            </li>
            <li>
              <strong>Contratuais:</strong> dados necessários para emissão e assinatura digital
              de contratos (Autentique), quando aplicável.
            </li>
          </ul>

          <h2>3. Finalidades e bases legais</h2>
          <ul>
            <li>
              <strong>Execução de contrato</strong> (art. 7º, V): operação da conta, presença em
              encontros, pontuação, indicações, cobrança do Gente HUB.
            </li>
            <li>
              <strong>Legítimo interesse</strong> (art. 7º, IX): segurança, prevenção a fraudes,
              melhoria de produto, métricas agregadas de saúde e engajamento.
            </li>
            <li>
              <strong>Consentimento</strong> (art. 7º, I): cookies analíticos/marketing,
              comunicações opcionais.
            </li>
            <li>
              <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): retenção de logs
              de acesso por 6 meses (Marco Civil) e emissão de documentos fiscais.
            </li>
          </ul>

          <h2>4. Compartilhamento</h2>
          <p>Compartilhamos dados apenas com operadores essenciais, sob contrato:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — banco de dados, autenticação e edge functions.
            </li>
            <li>
              <strong>Cloudflare</strong> — CDN, proteção contra ataques e hospedagem do frontend.
            </li>
            <li>
              <strong>Resend</strong> — envio transacional de e-mails.
            </li>
            <li>
              <strong>Autentique</strong> — assinatura digital de contratos com validade jurídica.
            </li>
            <li>
              <strong>Google (opcional)</strong> — quando o usuário conecta calendário para a
              agenda 1x1.
            </li>
          </ul>
          <p>
            Não vendemos dados pessoais e não compartilhamos para publicidade de terceiros sem
            consentimento específico.
          </p>

          <h2>5. Transferência internacional</h2>
          <p>
            Alguns operadores mantêm infraestrutura fora do Brasil. As transferências seguem as
            hipóteses do art. 33 da LGPD (contratos padrão, adequação e/ou consentimento
            específico quando exigido).
          </p>

          <h2>6. Retenção</h2>
          <p>
            Dados cadastrais são mantidos enquanto sua conta estiver ativa e por até 5 anos após
            o encerramento para cumprimento de obrigações legais e defesa em processos. Logs de
            acesso são mantidos por 6 meses. Dados anonimizados podem ser mantidos para métricas
            agregadas.
          </p>

          <h2>7. Direitos do titular (arts. 17 a 22)</h2>
          <p>Você pode, a qualquer momento, solicitar:</p>
          <ul>
            <li>Confirmação da existência de tratamento;</li>
            <li>Acesso e portabilidade dos dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Revogação do consentimento;</li>
            <li>Informação sobre uso compartilhado e consequências da recusa.</li>
          </ul>
          <p>
            Solicitações devem ser enviadas ao Encarregado. Responderemos no prazo legal
            (usualmente 15 dias), podendo pedir informações adicionais para confirmar sua
            identidade.
          </p>

          <h2>8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas: criptografia em trânsito (HTTPS/TLS),
            controle de acesso por papéis (RLS no banco), logs de auditoria, verificação de
            e-mail e proteção contra bots (Turnstile). Nenhum sistema é 100% imune a incidentes;
            em caso de comprometimento relevante de dados pessoais, notificaremos a ANPD e os
            titulares conforme o art. 48 da LGPD.
          </p>

          <h2>9. Cookies</h2>
          <p>
            Consulte a{' '}
            <Link to="/politica-de-cookies" className="text-primary underline">
              Política de Cookies
            </Link>{' '}
            para detalhes sobre categorias, finalidades e como gerenciar preferências.
          </p>

          <h2>10. Alterações</h2>
          <p>
            Podemos atualizar esta Política. Mudanças materiais serão comunicadas pelo e-mail
            cadastrado e por aviso na Plataforma antes de entrarem em vigor.
          </p>

          <h2>11. Canal com a ANPD</h2>
          <p>
            Sem prejuízo dos canais internos, o titular pode reclamar diretamente à Autoridade
            Nacional de Proteção de Dados (ANPD): <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">www.gov.br/anpd</a>.
          </p>

          <hr />
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Este é um modelo redigido para a plataforma Gente Comunidade
            e deve ser validado por assessoria jurídica antes da adoção em produção, ajustando
            operadores, prazos e endereços conforme sua realidade contratual.
          </p>
      </article>
    </>
  );
}
