/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { getProfileCompleteness, getProfileCompletenessPercent } from '@/lib/profile-completeness';

export function ProfileCompletionDialog({ profile, open, onDismiss }: { profile: Record<string, any>; open: boolean; onDismiss: () => void }) {
  const { missing } = getProfileCompleteness(profile);
  return <Dialog open={open && missing.length > 0} onOpenChange={value => { if (!value) onDismiss(); }}>
    <DialogContent data-contextual-guide className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>Seu perfil abre portas</DialogTitle><DialogDescription>Complete sua apresentação para encontrar conexões mais relevantes.</DialogDescription></DialogHeader>
      <p className="text-sm font-medium">Seu perfil está {getProfileCompletenessPercent(profile)}% completo</p>
      <Progress value={getProfileCompletenessPercent(profile)} />
      <ul className="grid gap-2 text-sm sm:grid-cols-2">{missing.map(field => <li key={field.key} className="text-wrap-anywhere">• {field.label}</li>)}</ul>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={onDismiss}>Lembrar mais tarde</Button><Button asChild><Link to="/perfil" onClick={onDismiss}>Completar perfil agora</Link></Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}