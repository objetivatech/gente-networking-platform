/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateLead } from '@/modules/lps/hooks/useLeads';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AlreadyMemberNotice } from '@/modules/lps/components/landing/AlreadyMemberNotice';


const CLIENT_LOCATIONS = [
  { value: 'cidade_regiao', label: 'Na minha cidade e região' },
  { value: 'estado', label: 'No meu estado' },
  { value: 'pais', label: 'Em qualquer lugar do país' },
] as const;

const REFERRAL_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google', label: 'Pesquisa no Google' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'outro', label: 'Outro' },
] as const;

const GROUP_OPTIONS = [
  { value: 'gente_master', label: 'GeNtE Master - Terça-Feira, das 7h30 às 9h' },
  { value: 'gente_impulso', label: 'GeNtE Impulso - Quarta-Feira, das 7h30 às 9h' },
  { value: 'gente_conect', label: 'GeNtE Conect - Quinta-Feira, das 7h30 às 9h' },
] as const;

const createFormSchema = (showNetworkingGoals: boolean) => z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  company: z.string().min(2, 'Empresa deve ter pelo menos 2 caracteres'),
  segment: z.string().min(2, 'Segmento deve ter pelo menos 2 caracteres'),
  client_location: z.string().min(1, 'Selecione uma opção'),
  referral_source: z.string().min(1, 'Selecione uma opção'),
  group_first_choice: showNetworkingGoals ? z.string().min(1, 'Selecione pelo menos uma opção') : z.string().optional(),
  group_second_choice: showNetworkingGoals ? z.string().min(1, 'Selecione pelo menos uma opção') : z.string().optional(),
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

interface LeadFormProps {
  landingPageId: string;
  source: string;
  eventEdition?: string;
  onSuccess?: () => void;
  buttonText?: string;
  buttonColor?: string;
  variant?: 'dark' | 'light';
  showNetworkingGoals?: boolean;
}

export function LeadForm({ 
  landingPageId, 
  source, 
  eventEdition, 
  onSuccess,
  buttonText = 'Enviar',
  buttonColor = 'hsl(var(--secondary))',
  variant = 'dark',
  showNetworkingGoals = true
}: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState<{ message: string; loginUrl: string } | null>(
    null,
  );
  const createLead = useCreateLead();
  const formSchema = createFormSchema(showNetworkingGoals);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      segment: '',
      client_location: '',
      referral_source: '',
      group_first_choice: '',
      group_second_choice: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setAlreadyMember(null);
    try {
      const result = await createLead.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        landing_page_id: landingPageId,
        source,
        event_edition: eventEdition || null,
        notes: null,
        segment: data.segment,
        client_location: data.client_location,
        referral_source: data.referral_source,
        group_first_choice: data.group_first_choice,
        group_second_choice: data.group_second_choice,
      });

      if (result.crm.status === 'already_member') {
        setAlreadyMember({ message: result.crm.message, loginUrl: result.crm.loginUrl });
        return;
      }
      form.reset();

      // GTM dataLayer conversion event
      if (typeof window !== 'undefined') {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'lead_form_submit',
          lead_source: source,
        });
      }


      toast.success('Inscrição realizada com sucesso!', {
        description: 'Você receberá mais informações em breve.'
      });
      onSuccess?.();
    } catch (error) {

      console.error('Error creating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar inscrição';
      toast.error('Erro ao realizar inscrição', {
        description: errorMessage.includes('duplicate')
          ? 'Este email já está cadastrado.'
          : 'Por favor, tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = variant === 'dark';
  const labelClass = isDark ? 'text-primary-foreground' : 'text-foreground font-medium';
  const inputClass = isDark 
    ? 'bg-background/10 border-border/20 text-primary-foreground placeholder:text-primary-foreground/50' 
    : 'bg-background border-border text-foreground placeholder:text-muted-foreground';
  const radioLabelClass = isDark ? 'text-primary-foreground/90' : 'text-muted-foreground';
  const sectionTitleClass = isDark 
    ? 'text-sm font-semibold text-secondary uppercase tracking-wide mb-3 mt-6 border-b border-border/10 pb-2' 
    : 'text-sm font-semibold text-secondary uppercase tracking-wide mb-3 mt-6 border-b border-border pb-2';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {alreadyMember && (
          <AlreadyMemberNotice
            message={alreadyMember.message}
            loginUrl={alreadyMember.loginUrl}
            variant={isDark ? 'dark' : 'light'}
          />
        )}

        {/* Dados Pessoais */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Nome Completo *</FormLabel>
              <FormControl>
                <Input placeholder="Nome e sobrenome" {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="seu@email.com" {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Telefone Celular *</FormLabel>
              <FormControl>
                <Input placeholder="(00) 00000-0000" {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Nome da Empresa *</FormLabel>
              <FormControl>
                <Input placeholder="Nome da sua empresa" {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sobre seu Negócio */}
        <div className={sectionTitleClass}>Sobre seu Negócio</div>

        <FormField
          control={form.control}
          name="segment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>
                Qual o segmento que você ou sua empresa atua? *
              </FormLabel>
              <p className={`text-xs ${isDark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                Informe apenas um segmento. Seja o mais específico possível.
              </p>
              <FormControl>
                <Input placeholder="Ex: Consultoria, Tecnologia, Saúde..." {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="client_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>
                Onde estão localizados os clientes que sua empresa busca? *
              </FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2 mt-2">
                  {CLIENT_LOCATIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`location-${option.value}`} />
                      <label htmlFor={`location-${option.value}`} className={`text-sm cursor-pointer ${radioLabelClass}`}>
                        {option.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referral_source"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Como ficou sabendo do GeNtE? *</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2 mt-2">
                  {REFERRAL_SOURCES.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`referral-${option.value}`} />
                      <label htmlFor={`referral-${option.value}`} className={`text-sm cursor-pointer ${radioLabelClass}`}>
                        {option.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showNetworkingGoals && (
          <>
            {/* Sobre seus Objetivos no Networking */}
            <div className={sectionTitleClass}>Sobre seus Objetivos no Networking</div>

            <FormField
              control={form.control}
              name="group_first_choice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Qual a sua PRIMEIRA opção de grupo para participar do GeNtE Networking? *
                  </FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2 mt-2">
                      {GROUP_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`first-${option.value}`} />
                          <label htmlFor={`first-${option.value}`} className={`text-sm cursor-pointer ${radioLabelClass}`}>
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="group_second_choice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Qual a sua SEGUNDA opção de grupo para participar do GeNtE Networking? *
                  </FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2 mt-2">
                      {GROUP_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`second-${option.value}`} />
                          <label htmlFor={`second-${option.value}`} className={`text-sm cursor-pointer ${radioLabelClass}`}>
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full text-primary-foreground font-bold py-3 text-lg transition-transform hover:scale-105 mt-6"
          style={{ backgroundColor: buttonColor }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </form>
    </Form>
  );
}
