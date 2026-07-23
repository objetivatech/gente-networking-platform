/**
 * Termos de Uso — Gente Comunidade (v3.28.0).
 * Modelo editável. Revisar com assessoria jurídica antes de publicar em produção.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function TermosDeUso() {
  const updated = '22 de julho de 2026';
  return (
    <>
      <Helmet>
        <title>Termos de Uso — Gente Comunidade</title>
        <meta
          name="description"
          content="Termos de Uso da plataforma Gente Comunidade, em conformidade com a LGPD (Lei 13.709/2018) e o Marco Civil da Internet."
        />
        <link rel="canonical" href="https://comunidade.gentenetworking.com.br/termos-de-uso" />
      </Helmet>
      <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm sm:prose-base dark:prose-invert">
          <p className="text-xs text-muted-foreground">Última atualização: {updated}</p>
          <h1>Termos de Uso</h1>
          <p>
            Estes Termos regulam o uso da plataforma <strong>Gente Comunidade</strong>{' '}
            ("Plataforma"), operada como sistema interno de gestão da comunidade de negócios
            Gente Networking. Ao criar uma conta ou acessar a Plataforma, você declara ter lido,
            compreendido e aceito integralmente estas condições.
          </p>

          <h2>1. Elegibilidade e cadastro</h2>
          <p>
            A Plataforma é destinada a maiores de 18 anos, membros, facilitadores, convidados e
            administradores devidamente autorizados pela organização. O cadastro é feito mediante
            convite ou aprovação, com fornecimento de dados verdadeiros e atualizados. A conta é
            pessoal e intransferível; você é responsável pelas ações realizadas com suas
            credenciais.
          </p>

          <h2>2. Uso permitido</h2>
          <ul>
            <li>Networking profissional, indicações, registros de reuniões e depoimentos.</li>
            <li>Publicação de conteúdo próprio ou com autorização de terceiros.</li>
            <li>
              É vedado publicar conteúdo ilícito, discriminatório, difamatório, que viole
              propriedade intelectual, dados pessoais de terceiros sem base legal, ou que utilize
              a Plataforma para prospecção não solicitada em massa (spam).
            </li>
          </ul>

          <h2>3. Propriedade intelectual</h2>
          <p>
            O código, marca, layout, textos institucionais e materiais de treinamento pertencem à
            Gente Networking e seus licenciantes. O conteúdo publicado pelos usuários permanece
            de sua titularidade; ao publicá-lo, você concede à Plataforma licença não exclusiva
            para exibi-lo aos demais usuários no contexto das funcionalidades contratadas.
          </p>

          <h2>4. Regras de conduta e moderação</h2>
          <p>
            Administradores podem, a qualquer tempo, remover conteúdo, suspender contas ou
            revogar acessos em caso de violação destes Termos, das políticas internas do grupo
            ou da legislação aplicável, garantido o direito de esclarecimento.
          </p>

          <h2>5. Serviços de terceiros</h2>
          <p>
            A Plataforma integra serviços de nuvem e comunicação (Supabase, Cloudflare, Resend,
            Autentique, entre outros). Ao utilizá-la, você reconhece a intermediação técnica
            desses fornecedores, sempre sob controles contratuais e técnicos compatíveis com a
            LGPD.
          </p>

          <h2>6. Limitação de responsabilidade</h2>
          <p>
            A Plataforma é fornecida "no estado em que se encontra", em regime de melhor esforço.
            Não nos responsabilizamos por perdas indiretas decorrentes do uso indevido da
            Plataforma, indisponibilidade de serviços de terceiros ou fatos alheios ao nosso
            controle razoável. Fatos supervenientes que impactem a operação serão comunicados
            pelos canais oficiais.
          </p>

          <h2>7. Encerramento</h2>
          <p>
            Você pode solicitar a desativação da conta a qualquer momento pelo canal de suporte.
            Os dados serão tratados conforme a{' '}
            <Link to="/politica-de-privacidade" className="text-primary underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <h2>8. Alterações</h2>
          <p>
            Estes Termos podem ser atualizados para refletir mudanças legais, técnicas ou de
            produto. Alterações relevantes serão comunicadas com antecedência razoável pelo
            e-mail cadastrado e/ou aviso na Plataforma.
          </p>

          <h2>9. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
            foro do domicílio do usuário para dirimir controvérsias, quando aplicável, sem
            prejuízo de outros foros previstos em lei.
          </p>

          <h2>10. Contato</h2>
          <p>
            Dúvidas ou solicitações: <a href="mailto:contato@gentenetworking.com.br">contato@gentenetworking.com.br</a>.
          </p>

          <hr />
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Este documento é um modelo de referência preparado para a
            Plataforma Gente Comunidade. Antes da adoção definitiva em produção, recomenda-se
            revisão por assessoria jurídica de sua confiança para adequação a especificidades do
            seu operador e público.
          </p>
      </article>
    </>
  );
}
