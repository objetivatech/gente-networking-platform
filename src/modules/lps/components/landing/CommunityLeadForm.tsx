/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { Loader2, Mail, Phone, User, BriefcaseBusiness } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateLead } from '@/modules/lps/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlreadyMemberNotice } from '@/modules/lps/components/landing/AlreadyMemberNotice';


const PROFESSION_OPTIONS = [
  'Advocacia',
  'Consultoria',
  'Corretagem',
  'Psicologia',
  'Contabilidade',
  'Arquitetura',
  'Assessoria',
  'Marketing',
  'Tecnologia',
  'Saúde',
  'Educação',
  'Outro',
] as const;

interface CommunityLeadFormProps {
  landingPageId: string;
  source: string;
  primaryColor?: string;
  onSuccess?: () => void;
  buttonText?: string;
}

export function CommunityLeadForm({
  landingPageId,
  source,
  primaryColor = 'hsl(var(--secondary))',
  onSuccess,
  buttonText = 'Entrar gratuitamente na comunidade',
}: CommunityLeadFormProps) {
  const createLead = useCreateLead();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profession: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState<{ message: string; loginUrl: string } | null>(
    null,
  );


  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.name.trim().length < 2) {
      toast.error('Informe seu nome completo.');
      return;
    }

    if (!formData.email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    if (formData.profession.trim().length < 2) {
      toast.error('Selecione sua área de atuação.');
      return;
    }

    setIsSubmitting(true);
    setAlreadyMember(null);

    try {
      const result = await createLead.mutateAsync({
        landing_page_id: landingPageId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        company: null,
        source,
        event_edition: null,
        notes: null,
        segment: formData.profession,
        client_location: null,
        referral_source: null,
        group_first_choice: null,
        group_second_choice: null,
      });

      if (result.crm.status === 'already_member') {
        setAlreadyMember({ message: result.crm.message, loginUrl: result.crm.loginUrl });
        return;
      }
      if (typeof window !== 'undefined') {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'lead_form_submit',
          lead_source: source,
        });
      }

      setFormData({ name: '', email: '', phone: '', profession: '' });


      toast.success('Inscrição realizada com sucesso!');
      onSuccess?.();
    } catch (error) {

      console.error('Error creating community lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar inscrição';
      toast.error('Erro ao enviar formulário', {
        description: errorMessage.includes('duplicate') ? 'Este email já está cadastrado.' : 'Por favor, tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = 'h-14 w-full min-w-0 rounded-[18px] border border-border bg-background pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground';

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
      {alreadyMember && (
        <AlreadyMemberNotice
          message={alreadyMember.message}
          loginUrl={alreadyMember.loginUrl}
        />
      )}

      <div className="relative w-full min-w-0">
        <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Seu nome completo"
          className={inputClassName}
        />
      </div>

      <div className="relative w-full min-w-0">
        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          value={formData.email}
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="Seu e-mail"
          className={inputClassName}
        />
      </div>

      <div className="relative w-full min-w-0">
        <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={formData.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="Seu telefone (opcional)"
          className={inputClassName}
        />
      </div>

      <div className="relative w-full min-w-0">
        <BriefcaseBusiness className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <select
          value={formData.profession}
          onChange={(event) => updateField('profession', event.target.value)}
          className="h-14 w-full min-w-0 max-w-full appearance-none rounded-[18px] border border-border bg-background pl-12 pr-4 text-base text-foreground outline-none"
        >
          <option value="">Sua profissão / área de atuação</option>
          {PROFESSION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-auto min-h-16 w-full min-w-0 rounded-[18px] px-4 py-4 text-center text-sm font-bold uppercase leading-tight tracking-normal text-primary-foreground transition-transform hover:scale-[1.01] sm:text-base md:text-lg [white-space:normal]"
        style={{ backgroundColor: primaryColor }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="min-w-0 whitespace-normal break-words">Enviando...</span>
          </>
        ) : (
          <span className="min-w-0 whitespace-normal break-words">{buttonText}</span>
        )}
      </Button>

      <p className="text-center text-sm text-primary-foreground/70">
        Não utilizaremos seus dados para envio de spam.
      </p>
    </form>
  );
}
