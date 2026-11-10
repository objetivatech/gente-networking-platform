/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export const LP_FIELD_LABELS = {
  phone: 'WhatsApp', company: 'Empresa', segment: 'Área de atuação',
  client_location: 'Onde estão seus clientes?', referral_source: 'Como conheceu o Gente?',
  group_first_choice: 'Primeira opção de Grupo', group_second_choice: 'Segunda opção de Grupo',
};
export type LpFieldKey = keyof typeof LP_FIELD_LABELS;
export interface LpField { visible: boolean; required: boolean; label: string }
export const LP_QUESTION_TYPES = ['text', 'textarea', 'select', 'radio', 'email', 'phone'] as const;
export type LpQuestionType = typeof LP_QUESTION_TYPES[number];
export const LP_OPTION_TYPES: readonly LpQuestionType[] = ['select', 'radio'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
export function isValidLpEmail(value: string): boolean { return value.length <= 200 && EMAIL_RE.test(value.trim()); }
/** Telefone BR: 10 ou 11 dígitos (com DDI 55 opcional), DDD 11-99, celular inicia com 9. */
export function isValidLpPhone(value: string): boolean {
  let d = value.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11 || d[2] === '0') return false;
  return d.length === 10 || d[2] === '9';
}
export function formatLpPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export interface LpQuestion { id: string; label: string; type: LpQuestionType; required: boolean; options: string[] }
export interface LpFormConfig { fields: Partial<Record<LpFieldKey, LpField>>; questions: LpQuestion[] }
export function normalizeLpForm(value: unknown, draft = false): LpFormConfig {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawFields = input.fields && typeof input.fields === 'object' ? input.fields as Record<string, unknown> : {};
  const fields: LpFormConfig['fields'] = {};
  for (const key of Object.keys(LP_FIELD_LABELS) as LpFieldKey[]) {
    const raw = rawFields[key];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    fields[key] = { visible: item.visible !== false, required: item.required === true,
      label: typeof item.label === 'string' && (draft || item.label.trim()) ? (draft ? item.label : item.label.trim()).slice(0, 160) : LP_FIELD_LABELS[key] };
  }
  const questions: LpQuestion[] = [];
  for (const raw of Array.isArray(input.questions) ? input.questions.slice(0, 20) : []) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(item.id) || questions.some(q => q.id === item.id)) continue;
    if (typeof item.label !== 'string' || (!draft && !item.label.trim())) continue;
    questions.push({ id: item.id, label: (draft ? item.label : item.label.trim()).slice(0, 160),
      type: (LP_QUESTION_TYPES as readonly string[]).includes(item.type as string) ? item.type as LpQuestionType : 'text', required: item.required === true,
      options: Array.isArray(item.options) ? item.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).map(o => o.trim().slice(0, 160)).slice(0, 40) : [] });
  }
  return { fields, questions };
}
export function hasConfiguredLpForm(config: unknown): boolean {
  const normalized = normalizeLpForm(config);
  return Object.keys(normalized.fields).length > 0 || normalized.questions.length > 0;
}
export function validateLpAnswers(config: LpFormConfig, values: Record<string, unknown>, answers: Record<string, string>): string | null {
  for (const [key, field] of Object.entries(config.fields)) {
    if (field.visible && field.required && (typeof values[key] !== 'string' || !String(values[key]).trim())) return `Preencha: ${field.label}`;
  }
  if (typeof values.email === 'string' && values.email.trim() && !isValidLpEmail(values.email)) return 'Informe um e-mail válido.';
  const phone = values.phone;
  if (config.fields.phone?.visible && typeof phone === 'string' && phone.trim() && !isValidLpPhone(phone)) return 'Informe um WhatsApp válido com DDD.';
  for (const question of config.questions) {
    const answer = answers[question.id]?.trim() ?? '';
    if (question.required && !answer) return `Preencha: ${question.label}`;
    if (answer.length > 1000) return `Resposta muito longa: ${question.label}`;
    if (LP_OPTION_TYPES.includes(question.type) && answer && !question.options.includes(answer)) return `Opção inválida: ${question.label}`;
    if (question.type === 'email' && answer && !isValidLpEmail(answer)) return `E-mail inválido: ${question.label}`;
    if (question.type === 'phone' && answer && !isValidLpPhone(answer)) return `Telefone inválido: ${question.label}`;
  }
  return null;
}