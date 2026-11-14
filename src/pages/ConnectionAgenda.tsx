/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { GuestAgenda } from '@/components/guests/GuestAgenda';
import SEO from '@/components/SEO';
export default function ConnectionAgenda() {
  return <div className="space-y-6"><SEO title="Encontros · Gente Conexões" description="Agenda dos próximos encontros do Gente Networking." /><GuestAgenda subscriber /></div>;
}