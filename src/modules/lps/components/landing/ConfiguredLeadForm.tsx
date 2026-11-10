/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState, type FormEvent } from 'react';
import { useCreateLead } from '../../hooks/useLeads';
import { normalizeLpForm, validateLpAnswers, formatLpPhone, isValidLpEmail, isValidLpPhone, type LpFieldKey } from '../../lib/form-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlreadyMemberNotice } from './AlreadyMemberNotice';
interface Props { config: unknown; landingPageId: string; source: string; buttonText?: string; eventEdition?: string; onSuccess?: () => void }
export function ConfiguredLeadForm({ config: rawConfig, landingPageId, source, buttonText = 'Enviar inscrição', eventEdition, onSuccess }: Props) {
  const config = normalizeLpForm(rawConfig);
  const createLead = useCreateLead();
  const [values, setValues] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [member, setMember] = useState<{ message: string; loginUrl: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalid = (values.name?.trim().length ?? 0) < 2 ? 'Informe seu nome completo.' : validateLpAnswers(config, values, answers);
    if (invalid) { toast.error(invalid); return; }
    setMember(null);
    try {
      const result = await createLead.mutateAsync({ landing_page_id: landingPageId, source, name: values.name ?? '', email: values.email ?? '',
        phone: values.phone, company: values.company, segment: values.segment, client_location: values.client_location,
        referral_source: values.referral_source, group_first_choice: values.group_first_choice, group_second_choice: values.group_second_choice, event_edition: eventEdition, answers });
      if (result.crm.status === 'already_member') { setMember(result.crm); return; }
      const target = window as Window & { dataLayer?: Record<string, unknown>[] };
      (target.dataLayer ??= []).push({ event: 'lead_form_submit', lead_source: source });
      setValues({}); setAnswers({}); toast.success('Inscrição recebida!'); onSuccess?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar. Tente novamente.'); }
  }
  const fieldInput = (key: string, label: string, required: boolean, type = 'text') => <div key={key} className="space-y-2">
    <Label htmlFor={`lp-${landingPageId}-${key}`}>{label}{required ? ' *' : ''}</Label>
    {key.startsWith('group_') ? <select id={`lp-${landingPageId}-${key}`} required={required} className="w-full rounded-md border border-input bg-background p-2" value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))}><option value="">Selecione</option><option value="gente_master">Gente Master</option><option value="gente_impulso">Gente Impulso</option><option value="gente_conect">Gente Conect</option></select> : <Input id={`lp-${landingPageId}-${key}`} name={key} type={type} required={required} maxLength={key === 'phone' ? 40 : ['name', 'segment'].includes(key) ? 120 : 200}
      inputMode={key === 'phone' ? 'tel' : undefined} placeholder={key === 'phone' ? '(51) 99999-9999' : undefined}
      value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: key === 'phone' ? formatLpPhone(event.target.value) : event.target.value }))} />
    }
    {key === 'email' && values.email && !isValidLpEmail(values.email) && <p className="text-sm text-destructive">E-mail inválido.</p>}
    {key === 'phone' && values.phone && values.phone.replace(/\D/g, '').length >= 10 && !isValidLpPhone(values.phone) && <p className="text-sm text-destructive">Número inválido. Use DDD + número.</p>}
  </div>;
  const setAnswer = (id: string, value: string) => setAnswers(prev => ({ ...prev, [id]: value }));
  return <form onSubmit={submit} data-rd-no-capture="true" className="space-y-4 text-foreground bg-background rounded-lg p-5">
    {member && <AlreadyMemberNotice {...member} />}
    {fieldInput('name', 'Nome completo', true)}{fieldInput('email', 'E-mail', true, 'email')}
    {(Object.keys(config.fields) as LpFieldKey[]).map(key => { const field = config.fields[key]; return field?.visible ? fieldInput(key, field.label, field.required, key === 'phone' ? 'tel' : 'text') : null; })}
    {config.questions.map(question => <div key={question.id} className="space-y-2">
      <Label htmlFor={`lp-${landingPageId}-${question.id}`}>{question.label}{question.required ? ' *' : ''}</Label>
      {question.type === 'select' ? <select id={`lp-${landingPageId}-${question.id}`} required={question.required} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground" value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, event.target.value)}>
        <option value="">Selecione</option>{question.options.map(option => <option key={option}>{option}</option>)}
      </select> : question.type === 'radio' ? <div role="radiogroup" aria-labelledby={`lp-${landingPageId}-${question.id}`} className="grid gap-2">
        {question.options.map(option => <label key={option} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 cursor-pointer has-[:checked]:border-primary">
          <input type="radio" name={`lp-${landingPageId}-${question.id}`} value={option} required={question.required} checked={answers[question.id] === option} onChange={() => setAnswer(question.id, option)} className="accent-primary" />{option}
        </label>)}
      </div> : question.type === 'textarea' ? <Textarea id={`lp-${landingPageId}-${question.id}`} required={question.required} maxLength={1000} value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, event.target.value)} /> :
        <Input id={`lp-${landingPageId}-${question.id}`} required={question.required} maxLength={question.type === 'phone' ? 20 : question.type === 'email' ? 200 : 1000}
          type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'} placeholder={question.type === 'phone' ? '(51) 99999-9999' : undefined}
          value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, question.type === 'phone' ? formatLpPhone(event.target.value) : event.target.value)} />}
      {question.type === 'email' && answers[question.id] && !isValidLpEmail(answers[question.id]) && <p className="text-sm text-destructive">E-mail inválido.</p>}
      {question.type === 'phone' && answers[question.id] && answers[question.id].replace(/\D/g, '').length >= 10 && !isValidLpPhone(answers[question.id]) && <p className="text-sm text-destructive">Número inválido.</p>}
    </div>)}
    <Button type="submit" className="w-full whitespace-normal h-auto min-h-11" disabled={createLead.isPending}>{createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{buttonText}</Button>
  </form>;
}