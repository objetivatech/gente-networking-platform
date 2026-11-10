/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export const LP_FIELD_LABELS = {
  phone: 'WhatsApp', company: 'Empresa', segment: 'Área de atuação',
  client_location: 'Onde estão seus clientes?', referral_source: 'Como conheceu o Gente?',
  group_first_choice: 'Primeira opção de Grupo', group_second_choice: 'Segunda opção de Grupo',
};
export type LpFieldKey = keyof typeof LP_FIELD_LABELS;
export interface LpField { visible: boolean; required: boolean; label: string }
export interface LpQuestion { id: string; label: string; type: 'text' | 'textarea' | 'select'; required: boolean; options: string[] }
export interface LpFormConfig { fields: Partial<Record<LpFieldKey, LpField>>; questions: LpQuestion[] }
export function normalizeLpForm(value: unknown): LpFormConfig {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawFields = input.fields && typeof input.fields === 'object' ? input.fields as Record<string, unknown> : {};
  const fields: LpFormConfig['fields'] = {};
  for (const key of Object.keys(LP_FIELD_LABELS) as LpFieldKey[]) {
    const raw = rawFields[key];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    fields[key] = { visible: item.visible !== false, required: item.required === true,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim().slice(0, 160) : LP_FIELD_LABELS[key] };
  }
  const questions: LpQuestion[] = [];
  for (const raw of Array.isArray(input.questions) ? input.questions.slice(0, 20) : []) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(item.id) || questions.some(q => q.id === item.id)) continue;
    if (typeof item.label !== 'string' || !item.label.trim()) continue;
    questions.push({ id: item.id, label: item.label.trim().slice(0, 160),
      type: item.type === 'select' || item.type === 'textarea' ? item.type : 'text', required: item.required === true,
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
  for (const question of config.questions) {
    const answer = answers[question.id]?.trim() ?? '';
    if (question.required && !answer) return `Preencha: ${question.label}`;
    if (answer.length > 1000) return `Resposta muito longa: ${question.label}`;
    if (question.type === 'select' && answer && !question.options.includes(answer)) return `Opção inválida: ${question.label}`;
  }
  return null;
}