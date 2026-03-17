// Shared email template utilities for Gente Networking
// All emails use consistent branding: Navy Blue #1e3a5f and Orange #f7941d

const APP_URL = "https://comunidade.gentenetworking.com.br";
// White horizontal logo for dark email headers - better visibility
const LOGO_URL = "https://network-bloom-forge.lovable.app/logo-gente-branco.png?v=2";

// Base email wrapper with consistent styling
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gente Networking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(30, 58, 95, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 32px 24px; text-align: center;">
              <img src="${LOGO_URL}" alt="Gente Networking" style="max-width: 280px; width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Conectando pessoas, gerando negócios</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">
                Gente Networking - Conectando pessoas, gerando negócios.
              </p>
              <p style="margin: 0;">
                <a href="${APP_URL}/configuracoes" style="color: #1e3a5f; font-size: 12px; text-decoration: underline;">
                  Gerenciar preferências de notificação
                </a>
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0;">
                © ${new Date().getFullYear()} Gente Networking. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Orange CTA button style
function ctaButton(text: string, url: string): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding: 24px 0;">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #f7941d 0%, #e8850f 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 12px rgba(247, 148, 29, 0.3);">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

// Info box styles
function infoBox(content: string, variant: 'orange' | 'blue' | 'green' = 'orange'): string {
  const styles = {
    orange: { bg: '#fff7ed', border: '#f7941d', text: '#9a3412' },
    blue: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    green: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
  };
  const s = styles[variant];
  
  return `
<div style="background: ${s.bg}; border-left: 4px solid ${s.border}; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
  ${content}
</div>`;
}

// Contact card for referrals
function contactCard(name: string, phone?: string, email?: string, notes?: string): string {
  let details = `<p style="color: #1e3a5f; font-size: 20px; font-weight: 700; margin: 0 0 12px;">${name}</p>`;
  
  if (phone) {
    details += `<p style="color: #475569; font-size: 14px; margin: 4px 0;">📱 ${phone}</p>`;
  }
  if (email) {
    details += `<p style="color: #475569; font-size: 14px; margin: 4px 0;">✉️ ${email}</p>`;
  }
  if (notes) {
    details += `<p style="color: #64748b; font-size: 14px; font-style: italic; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #e2e8f0;">💬 "${notes}"</p>`;
  }
  
  return `
<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 24px 0;">
  ${details}
</div>`;
}

// Points badge
function pointsBadge(points: number, description: string): string {
  return `
<div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
  <p style="color: #047857; font-size: 24px; font-weight: 700; margin: 0;">+${points} pontos</p>
  <p style="color: #059669; font-size: 14px; margin: 8px 0 0;">${description}</p>
</div>`;
}

// Email Templates

export function testimonialEmailTemplate(fromName: string, toName: string, content: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Você recebeu um novo depoimento! 🎉</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${toName}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  <strong style="color: #1e3a5f;">${fromName}</strong> escreveu um depoimento para você:
</p>
${infoBox(`<p style="color: #9a3412; font-size: 16px; font-style: italic; line-height: 1.6; margin: 0;">"${content}"</p>`, 'orange')}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Acesse a plataforma para ver todos os seus depoimentos!
</p>
${ctaButton('Ver Depoimentos', `${APP_URL}/depoimentos`)}`;

  return emailWrapper(emailContent);
}

export function referralEmailTemplate(
  fromName: string, 
  toName: string, 
  contactName: string, 
  contactPhone?: string, 
  contactEmail?: string, 
  notes?: string
): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Você recebeu uma nova indicação! 📞</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${toName}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  <strong style="color: #1e3a5f;">${fromName}</strong> indicou um contato para você:
</p>
${contactCard(contactName, contactPhone, contactEmail, notes)}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Acesse a plataforma para ver os detalhes completos!
</p>
${ctaButton('Ver Indicações', `${APP_URL}/indicacoes`)}`;

  return emailWrapper(emailContent);
}

export function welcomeEmailTemplate(name: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Bem-vindo à comunidade! 🎉</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Estamos muito felizes em tê-lo(a) como parte da nossa comunidade de networking!
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  O Gente Networking é uma plataforma onde você pode:
</p>
<div style="margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px;">
  <p style="color: #475569; font-size: 15px; line-height: 2; margin: 0;">✅ Registrar reuniões 1-a-1 com outros membros</p>
  <p style="color: #475569; font-size: 15px; line-height: 2; margin: 0;">✅ Enviar e receber indicações de negócios</p>
  <p style="color: #475569; font-size: 15px; line-height: 2; margin: 0;">✅ Compartilhar depoimentos sobre membros</p>
  <p style="color: #475569; font-size: 15px; line-height: 2; margin: 0;">✅ Participar de encontros da comunidade</p>
  <p style="color: #475569; font-size: 15px; line-height: 2; margin: 0;">✅ Acompanhar seu progresso no ranking</p>
</div>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Complete seu perfil para que outros membros possam conhecê-lo(a) melhor!
</p>
${ctaButton('Completar Meu Perfil', `${APP_URL}/perfil`)}`;

  return emailWrapper(emailContent);
}

export function invitationAcceptedEmailTemplate(inviterName: string, newMemberName: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Seu convite foi aceito! 🎉</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${inviterName}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Ótima notícia! <strong style="color: #1e3a5f;">${newMemberName}</strong> aceitou seu convite e agora faz parte da comunidade Gente Networking!
</p>
${pointsBadge(15, 'Você ganhou pontos por trazer um novo membro! Quando o convidado comparecer a um encontro, você ganha mais 15 pontos.')}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Continue convidando pessoas e acumulando pontos para subir no ranking!
</p>
${ctaButton('Ver Meus Convites', `${APP_URL}/convites`)}`;

  return emailWrapper(emailContent);
}

export function guestAttendedEmailTemplate(inviterName: string, guestName: string, meetingTitle: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Seu convidado compareceu! 🎉</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${inviterName}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  <strong style="color: #1e3a5f;">${guestName}</strong> compareceu ao encontro <strong>"${meetingTitle}"</strong>!
</p>
${pointsBadge(15, 'Você ganhou pontos porque seu convidado compareceu a um encontro!')}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Continue convidando pessoas e acumulando pontos para subir no ranking!
</p>
${ctaButton('Ver Meu Ranking', `${APP_URL}/ranking`)}`;

  return emailWrapper(emailContent);
}

export function meetingReminderEmailTemplate(name: string, meetingTitle: string, meetingDate: string, meetingTime?: string, location?: string): string {
  const timeInfo = meetingTime ? ` às ${meetingTime}` : '';
  const locationInfo = location ? `<p style="color: #475569; font-size: 14px; margin: 4px 0;">📍 ${location}</p>` : '';
  
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Lembrete de Encontro 📅</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Este é um lembrete sobre o próximo encontro da comunidade:
</p>
<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 24px 0;">
  <p style="color: #1e3a5f; font-size: 20px; font-weight: 700; margin: 0 0 12px;">${meetingTitle}</p>
  <p style="color: #475569; font-size: 14px; margin: 4px 0;">📅 ${meetingDate}${timeInfo}</p>
  ${locationInfo}
</div>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Confirme sua presença na plataforma!
</p>
${ctaButton('Ver Encontros', `${APP_URL}/encontros`)}`;

  return emailWrapper(emailContent);
}

// Magic link email for authentication (to replace Supabase default)
export function magicLinkEmailTemplate(name: string, magicLink: string, otp?: string): string {
  const otpSection = otp ? `
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0; text-align: center;">
  Ou use o código abaixo:
</p>
<div style="background: #f8fafc; border: 2px dashed #1e3a5f; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
  <p style="color: #1e3a5f; font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0;">${otp}</p>
</div>` : '';

  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Entrar no Gente Networking 🔐</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Clique no botão abaixo para entrar na sua conta:
</p>
${ctaButton('Entrar na Plataforma', magicLink)}
${otpSection}
<p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
  Este link expira em 1 hora. Se você não solicitou este email, pode ignorá-lo com segurança.
</p>`;

  return emailWrapper(emailContent);
}

// Password reset email (to replace Supabase default)
export function passwordResetEmailTemplate(name: string, resetLink: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Redefinir Senha 🔑</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
</p>
${ctaButton('Redefinir Minha Senha', resetLink)}
<p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
  Este link expira em 1 hora. Se você não solicitou a redefinição de senha, pode ignorar este email.
</p>`;

  return emailWrapper(emailContent);
}

// Confirmation email (to replace Supabase default)
export function confirmEmailTemplate(name: string, confirmLink: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Confirme seu Email ✉️</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Obrigado por se cadastrar no Gente Networking! Por favor, confirme seu email clicando no botão abaixo:
</p>
${ctaButton('Confirmar Meu Email', confirmLink)}
<p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
  Se você não criou uma conta, pode ignorar este email.
</p>`;

  return emailWrapper(emailContent);
}

// Invitation email (when someone is invited to join)
export function invitationEmailTemplate(inviterName: string, guestName: string, inviteLink: string): string {
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Você foi convidado! 🎉</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${guestName || 'Futuro membro'}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  <strong style="color: #1e3a5f;">${inviterName}</strong> convidou você para fazer parte do Gente Networking, uma comunidade exclusiva de networking profissional!
</p>
${infoBox(`
<p style="color: #1e40af; font-size: 16px; line-height: 1.6; margin: 0;">
  <strong>O que você vai encontrar:</strong><br/>
  ✅ Conexões profissionais de qualidade<br/>
  ✅ Indicações de negócios<br/>
  ✅ Encontros regulares de networking<br/>
  ✅ Crescimento profissional contínuo
</p>
`, 'blue')}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Clique no botão abaixo para aceitar o convite e começar sua jornada:
</p>
${ctaButton('Aceitar Convite', inviteLink)}
<p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
  Este convite expira em 30 dias.
</p>`;

  return emailWrapper(emailContent);
}

// New meeting scheduled notification
export function newMeetingEmailTemplate(name: string, meetingTitle: string, meetingDate: string, meetingTime?: string, location?: string, teamName?: string): string {
  const timeInfo = meetingTime ? ` às ${meetingTime}` : '';
  const locationInfo = location ? `<p style="color: #475569; font-size: 14px; margin: 4px 0;">📍 ${location}</p>` : '';
  const teamInfo = teamName ? `<p style="color: #475569; font-size: 14px; margin: 4px 0;">👥 Grupo: ${teamName}</p>` : '';
  
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Novo Encontro Agendado! 📅</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Um novo encontro foi agendado para a sua comunidade:
</p>
<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 24px 0;">
  <p style="color: #1e3a5f; font-size: 20px; font-weight: 700; margin: 0 0 12px;">${meetingTitle}</p>
  <p style="color: #475569; font-size: 14px; margin: 4px 0;">📅 ${meetingDate}${timeInfo}</p>
  ${locationInfo}
  ${teamInfo}
</div>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Acesse a plataforma para confirmar sua presença!
</p>
${ctaButton('Ver Encontros', `${APP_URL}/encontros`)}`;

  return emailWrapper(emailContent);
}

// Council post notification
export function councilPostEmailTemplate(name: string, authorName: string, postTitle: string, teamName?: string): string {
  const teamInfo = teamName ? ` no grupo ${teamName}` : '';
  
  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Novo Desafio no Conselho 24/7! 💡</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  <strong style="color: #1e3a5f;">${authorName}</strong> abriu um novo desafio${teamInfo}:
</p>
${infoBox(`<p style="color: #1e40af; font-size: 16px; font-weight: 600; line-height: 1.6; margin: 0;">"${postTitle}"</p>`, 'blue')}
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Compartilhe sua experiência e ajude a resolver este desafio!
</p>
${ctaButton('Responder no Conselho', `${APP_URL}/conselho`)}`;

  return emailWrapper(emailContent);
}

// Rank change notification
export function rankChangeEmailTemplate(name: string, oldRank: string, newRank: string): string {
  const rankLabels: Record<string, string> = {
    iniciante: '🌱 Iniciante',
    bronze: '🥉 Bronze',
    prata: '🥈 Prata',
    ouro: '🥇 Ouro',
    diamante: '💎 Diamante',
  };

  const emailContent = `
<h1 style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0 0 24px;">Parabéns! Você subiu de nível! 🏆</h1>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Olá <strong style="color: #1e3a5f;">${name}</strong>,
</p>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Seu esforço e dedicação foram reconhecidos! Você acaba de subir de nível:
</p>
<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
  <p style="color: #92400e; font-size: 16px; margin: 0 0 8px;">De: ${rankLabels[oldRank] || oldRank}</p>
  <p style="color: #1e3a5f; font-size: 28px; font-weight: 700; margin: 0;">→ ${rankLabels[newRank] || newRank}</p>
</div>
<p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
  Continue participando e acumulando pontos para alcançar novos patamares!
</p>
${ctaButton('Ver Meu Ranking', `${APP_URL}/ranking`)}`;

  return emailWrapper(emailContent);
}