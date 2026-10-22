/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
interface AlreadyMemberNoticeProps {
  message?: string;
  loginUrl: string;
  variant?: 'light' | 'dark';
}

/**
 * Shown when the CRM answers `409 already_member`: the visitor is already an
 * active member, so this is a flow success, not an error.
 */
export function AlreadyMemberNotice({
  message,
  loginUrl,
  variant = 'light',
}: AlreadyMemberNoticeProps) {
  const isDark = variant === 'dark';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-4 text-sm leading-relaxed ${
        isDark
          ? 'border-border/40 bg-secondary/10 text-primary-foreground'
          : 'border-orange-200 bg-orange-50 text-foreground'
      }`}
    >
      <strong className="block">Você já faz parte do Gente!</strong>
      <span>
        {message || 'Não é preciso se cadastrar de novo.'}{' '}
        <a
          href={loginUrl}
          className={`font-semibold underline ${isDark ? 'text-secondary' : 'text-secondary'}`}
        >
          Acessar a plataforma
        </a>
      </span>
    </div>
  );
}
