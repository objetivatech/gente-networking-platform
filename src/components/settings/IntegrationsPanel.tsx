/**
 * IntegrationsPanel - Central de integrações da plataforma (v3.36.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only. Pagamentos, assinatura digital e e-mail: escolha do provedor,
 * ambiente, remetente, limite de disparos e as próprias chaves de API, que são
 * gravadas cifradas no cofre do banco (Vault) e nunca voltam para o navegador.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  FileSignature,
  Mail,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  PlugZap,
} from 'lucide-react';
import {
  INTEGRATION_PROVIDERS,
  useDeleteSecret,
  useIntegrationSecrets,
  useIntegrationSettings,
  useSaveIntegration,
  useSaveSecret,
  useTestIntegration,
  type IntegrationCategory,
  type IntegrationSetting,
} from '@/hooks/useIntegrations';

const CATEGORY_META: Record<
  IntegrationCategory,
  { title: string; description: string; icon: typeof Mail }
> = {
  payments: {
    title: 'Pagamentos',
    description: 'Cobrança dos leads Gente HUB e assinaturas premium.',
    icon: CreditCard,
  },
  signature: {
    title: 'Assinatura digital',
    description: 'Envio e assinatura dos contratos gerados pelo CRM.',
    icon: FileSignature,
  },
  email: {
    title: 'Disparo de e-mails',
    description:
      'Os templates continuam na plataforma — aqui muda apenas o meio de envio.',
    icon: Mail,
  },
};

/** Campo de chave: grava cifrado no cofre e nunca exibe o valor salvo. */
function SecretField({
  name,
  label,
  configured,
}: {
  name: string;
  label: string;
  configured?: boolean;
}) {
  const saveSecret = useSaveSecret();
  const removeSecret = useDeleteSecret();
  const [value, setValue] = useState('');

  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="flex items-center gap-2 text-xs">
        <KeyRound className="h-3.5 w-3.5" />
        <span className="text-wrap-anywhere">{label}</span>
        <Badge
          variant="outline"
          className={configured ? 'border-emerald-400 text-emerald-700' : 'border-amber-400 text-amber-700'}
        >
          {configured ? 'configurada' : 'vazia'}
        </Badge>
      </Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={configured ? '•••••••• (já salva — digite para substituir)' : 'Cole a chave aqui'}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!value.trim() || saveSecret.isPending}
            onClick={() => saveSecret.mutate({ name, value: value.trim() }, { onSuccess: () => setValue('') })}
          >
            Salvar
          </Button>
          {configured && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remover ${label}`}
              onClick={() => removeSecret.mutate(name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  setting,
  secrets,
}: {
  category: IntegrationCategory;
  setting?: IntegrationSetting;
  secrets: Record<string, boolean>;
}) {
  const save = useSaveIntegration();
  const testIntegration = useTestIntegration();
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const providers = INTEGRATION_PROVIDERS[category];

  const [provider, setProvider] = useState(setting?.provider ?? '');
  const [environment, setEnvironment] = useState(setting?.environment ?? 'production');
  const [fromName, setFromName] = useState(String(setting?.config?.['from_name'] ?? ''));
  const [fromEmail, setFromEmail] = useState(String(setting?.config?.['from_email'] ?? ''));
  const [limitCount, setLimitCount] = useState(setting?.rate_limit_count?.toString() ?? '');
  const [limitWindow, setLimitWindow] = useState(
    setting?.rate_limit_window_hours?.toString() ?? '',
  );

  useEffect(() => {
    if (!setting) return;
    setProvider(setting.provider ?? '');
    setEnvironment(setting.environment ?? 'production');
    setFromName(String(setting.config?.['from_name'] ?? ''));
    setFromEmail(String(setting.config?.['from_email'] ?? ''));
    setLimitCount(setting.rate_limit_count?.toString() ?? '');
    setLimitWindow(setting.rate_limit_window_hours?.toString() ?? '');
  }, [setting]);

  const selected = providers.find((p) => p.value === provider);
  const secretOk = selected ? secrets[selected.secret] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {meta.title}
        </CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Provedor ativo</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Teste (sandbox)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {category === 'email' && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do remetente</Label>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Gente Networking"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do remetente</Label>
                <Input
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@gentenetworking.com.br"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Limite de disparos</Label>
                <Input
                  type="number"
                  min={0}
                  value={limitCount}
                  onChange={(e) => setLimitCount(e.target.value)}
                  placeholder="Ex.: 50 envios"
                />
              </div>
              <div className="space-y-1.5">
                <Label>A cada (horas)</Label>
                <Input
                  type="number"
                  min={0}
                  value={limitWindow}
                  onChange={(e) => setLimitWindow(e.target.value)}
                  placeholder="Ex.: 24"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O limite vale para notificações; e-mails transacionais (login, convites) nunca são
              bloqueados.
            </p>
          </>
        )}

        {selected && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Credenciais de {selected.label}. Ficam cifradas no cofre do banco e nunca são exibidas
              novamente.
            </p>
            <SecretField
              name={selected.secret}
              label={`Chave de API (${selected.secret})`}
              configured={secrets[selected.secret]}
            />
            {selected.extraSecrets?.map((extra) => (
              <SecretField
                key={extra.name}
                name={extra.name}
                label={`${extra.label} (${extra.name})`}
                configured={secrets[extra.name]}
              />
            ))}
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!secretOk || testIntegration.isPending}
              onClick={() =>
                testIntegration.mutate({ category, provider: selected.value, secret: selected.secret })
              }
            >
              <PlugZap className="h-4 w-4" />
              Testar conexão
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">

          {selected ? (
            <Badge
              variant="outline"
              className={`gap-1 ${
                secretOk
                  ? 'border-emerald-400 text-emerald-700'
                  : 'border-amber-400 text-amber-700'
              }`}
            >
              {secretOk ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {selected.secret}: {secretOk ? 'configurada' : 'não configurada'}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Selecione um provedor.</span>
          )}

          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                category,
                provider: provider || null,
                environment,
                config:
                  category === 'email'
                    ? { from_name: fromName, from_email: fromEmail }
                    : (setting?.config ?? {}),
                rate_limit_count: limitCount ? Number(limitCount) : null,
                rate_limit_window_hours: limitWindow ? Number(limitWindow) : null,
              })
            }
          >
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function IntegrationsPanel() {
  const { data: settings } = useIntegrationSettings();
  const { data: secrets } = useIntegrationSecrets();

  const byCategory = new Map((settings ?? []).map((s) => [s.category, s]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure tudo por aqui: provedor ativo, regras de uso e as chaves de API. As chaves são
        gravadas cifradas no cofre do banco, nunca aparecem de volta na tela e continuam válidas as
        chaves que já estavam no ambiente.
      </p>
      {(['payments', 'signature', 'email'] as IntegrationCategory[]).map((c) => (
        <CategoryCard
          key={c}
          category={c}
          setting={byCategory.get(c)}
          secrets={secrets ?? {}}
        />
      ))}
    </div>
  );
}
