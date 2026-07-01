/**
 * @file profile-completeness.ts
 * @description Regras de completude do perfil usadas para liberar a publicação da
 * página pública (/p/:slug) e a geração do cartão digital. Um perfil só pode ser
 * publicado quando todas as informações obrigatórias (imagem + textos) estiverem
 * preenchidas. Centraliza a lista para reuso entre Profile.tsx e o cartão.
 * @copyright Ranktop / Gente Networking
 */

export interface ProfileCompletenessField {
  key: string;
  label: string;
  filled: boolean;
}

/** Retorna true se o valor textual estiver preenchido (não vazio). */
function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Avalia a completude do perfil para fins de publicação.
 * Campos obrigatórios: foto (avatar), nome, empresa, cargo, segmento, bio,
 * "o que eu faço", "cliente ideal" e "como me indicar".
 */
export function getProfileCompleteness(profile: Record<string, any> | null | undefined): {
  fields: ProfileCompletenessField[];
  missing: ProfileCompletenessField[];
  isComplete: boolean;
} {
  const p = profile || {};
  const fields: ProfileCompletenessField[] = [
    { key: 'avatar_url', label: 'Foto de perfil', filled: hasText(p.avatar_url) },
    { key: 'full_name', label: 'Nome completo', filled: hasText(p.full_name) },
    { key: 'company', label: 'Empresa', filled: hasText(p.company) },
    { key: 'position', label: 'Cargo', filled: hasText(p.position) },
    { key: 'business_segment', label: 'Segmento de atuação', filled: hasText(p.business_segment) },
    { key: 'bio', label: 'Bio / apresentação', filled: hasText(p.bio) },
    { key: 'what_i_do', label: 'O que eu faço', filled: hasText(p.what_i_do) },
    { key: 'ideal_client', label: 'Cliente ideal', filled: hasText(p.ideal_client) },
    { key: 'how_to_refer_me', label: 'Como me indicar', filled: hasText(p.how_to_refer_me) },
  ];

  const missing = fields.filter((f) => !f.filled);
  return { fields, missing, isComplete: missing.length === 0 };
}
