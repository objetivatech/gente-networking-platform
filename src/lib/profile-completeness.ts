/**
 * @file profile-completeness.ts
 * @description Regras de completude do perfil usadas para liberar a publicação da
 * página pública (/p/:slug) e a geração do cartão digital. Um perfil só pode ser
 * publicado quando todas as informações obrigatórias (imagem + textos) estiverem
 * preenchidas. Centraliza a lista para reuso entre Profile.tsx e o cartão.
 * @copyright Ranktop / Gente Networking
 */

import { analyzeDoorBridge, type ConnectionTaxonomy } from './connection-doors';

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

/** Percentual (0–100) de campos obrigatórios preenchidos. */
export function getProfileCompletenessPercent(profile: Record<string, any> | null | undefined): number {
  const { fields, missing } = getProfileCompleteness(profile);
  return Math.round(((fields.length - missing.length) * 100) / fields.length);
}

export type CompletenessLevel = 'complete' | 'almost' | 'incomplete';

/** 100% = completo; 70–99% = faltam poucos campos; abaixo disso = incompleto. */
export function getCompletenessLevel(percent: number): CompletenessLevel {
  if (percent >= 100) return 'complete';
  if (percent >= 70) return 'almost';
  return 'incomplete';
}

const tokenize = (v: unknown): Set<string> =>
  new Set(
    String(v ?? '')
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );

const overlap = (a: Set<string>, b: Set<string>) => { let n = 0; a.forEach((w) => { if (b.has(w)) n++; }); return n; };

/** Afinidade simples entre o visitante e um perfil da vitrine (0 = sem compatibilidade). */
export function getCompatibilityScore(viewer: Record<string, any> | null | undefined, target: Record<string, any>, taxonomies: ConnectionTaxonomy[] = []): number {
  if (!viewer) return 0;
  let score = 0;
  const vt = new Set<string>((viewer.tags || []).map((t: string) => t.toLowerCase()));
  (target.tags || []).forEach((t: string) => { if (vt.has(t.toLowerCase())) score += 3; });
  if (viewer.business_segment && target.business_segment &&
      viewer.business_segment.trim().toLowerCase() === target.business_segment.trim().toLowerCase()) score += 2;
  score += Math.min(4, overlap(tokenize(viewer.ideal_client), tokenize(`${target.what_i_do ?? ''} ${target.business_segment ?? ''}`)));
  score += Math.min(4, overlap(tokenize(target.ideal_client), tokenize(`${viewer.what_i_do ?? ''} ${viewer.business_segment ?? ''}`)));
  return score + analyzeDoorBridge(viewer, target, taxonomies).score;
}

/** Ordenação padrão da vitrine: 1º completude (desc), 2º compatibilidade (desc), 3º nome. */
export function sortByCompletenessAndCompatibility<T extends { full_name: string; percent: number; compatibility: number }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    b.percent - a.percent || b.compatibility - a.compatibility || a.full_name.localeCompare(b.full_name, 'pt-BR'));
}
