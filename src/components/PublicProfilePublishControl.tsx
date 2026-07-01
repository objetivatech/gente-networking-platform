/**
 * @file PublicProfilePublishControl.tsx
 * @description Controle de publicação da página pública do perfil (/p/:slug).
 * Exibe um checklist de completude com tooltips indicando os campos que ainda
 * faltam preencher e só permite publicar quando o perfil está completo.
 * Também expõe o link público e o estado de publicação.
 * @copyright Ranktop / Gente Networking
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getProfileCompleteness } from '@/lib/profile-completeness';

interface Props {
  profile: Record<string, any> | null | undefined;
  onTogglePublish: (enabled: boolean) => void;
  isUpdating?: boolean;
}

export function PublicProfilePublishControl({ profile, onTogglePublish, isUpdating }: Props) {
  const { toast } = useToast();
  const { fields, missing, isComplete } = getProfileCompleteness(profile);
  const isPublished = !!profile?.public_profile_enabled;
  const publicPath = `/p/${profile?.slug || profile?.id || ''}`;
  const publicUrl = `${window.location.origin}${publicPath}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: 'Link copiado!', description: 'Compartilhe sua página pública.' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Página Pública do Perfil
            </CardTitle>
            <CardDescription>
              Uma página externa com seus dados e um convite para conhecer o Gente.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={isPublished}
                    disabled={(!isComplete && !isPublished) || isUpdating}
                    onCheckedChange={onTogglePublish}
                    aria-label="Publicar página pública"
                  />
                </div>
              </TooltipTrigger>
              {!isComplete && !isPublished && (
                <TooltipContent>
                  Complete todos os campos obrigatórios para publicar.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist de completude */}
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <Tooltip key={f.key}>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      f.filled
                        ? 'border-green-500/30 bg-green-500/10 text-green-600'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {f.filled ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    {f.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {f.filled ? 'Preenchido' : 'Preencha este campo para publicar sua página.'}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {!isComplete && (
          <p className="text-xs text-muted-foreground">
            Faltam {missing.length} {missing.length === 1 ? 'campo' : 'campos'} para liberar a
            publicação e a geração do cartão digital.
          </p>
        )}

        {isPublished && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate text-xs">{publicUrl}</code>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={publicPath} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
