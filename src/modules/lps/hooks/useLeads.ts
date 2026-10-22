/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fallbackSource, parseSubmission, PLATFORM_ORIGIN } from '../lib/rules';
interface LeadInput {
  landing_page_id: string | null; source: string; name: string; email: string;
  phone?: string | null; company?: string | null; segment?: string | null;
  event_edition?: string | null; notes?: string | null; client_location?: string | null;
  referral_source?: string | null; group_first_choice?: string | null; group_second_choice?: string | null;
}
export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInput) => {
      const { data: page, error: pageError } = await supabase.from('landing_pages').select('slug, capture_source, is_active').eq('id', lead.landing_page_id ?? '').single();
      if (pageError || !page?.is_active) throw new Error('Página indisponível para inscrições.');
      const params = new URLSearchParams(window.location.search);
      const notes = [lead.notes, lead.client_location && `Localização: ${lead.client_location}`, lead.referral_source && `Conheceu por: ${lead.referral_source}`, lead.group_second_choice && `Segunda opção: ${lead.group_second_choice}`, lead.event_edition && `Edição: ${lead.event_edition}`].filter(Boolean).join('\n');
      const { data, error } = await supabase.functions.invoke('submit-lead', { body: {
        name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, business_segment: lead.segment,
        source: page.capture_source ?? fallbackSource(page.slug), source_detail: page.slug,
        target_team_name: lead.group_first_choice || undefined,
        page_url: window.location.href, page_title: document.title,
        invitation_code: params.get('convite') || undefined, invited_by: params.get('ref') || undefined,
        notes: notes || undefined, app_base_url: PLATFORM_ORIGIN,
      }});
      if (error) {
        const response = 'context' in error && error.context instanceof Response ? error.context : null;
        if (!response) throw new Error('Não foi possível concluir a inscrição. Tente novamente.');
        const body = await response.clone().json().catch(() => ({}));
        return { crm: parseSubmission(response.status, body) };
      }
      return { crm: parseSubmission(200, data ?? {}) };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-leads'] }),
  });
}