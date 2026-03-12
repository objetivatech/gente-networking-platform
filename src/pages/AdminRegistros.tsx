import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminDelete } from '@/hooks/useAdminData';
import AdminDataView from '@/components/AdminDataView';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Handshake, MessageSquare, Send, DollarSign, UserPlus, Loader2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';

const statusColors: Record<string, string> = {
  frio: 'bg-blue-100 text-blue-700 border-blue-300',
  morno: 'bg-orange-100 text-orange-700 border-orange-300',
  quente: 'bg-red-100 text-red-700 border-red-300',
};

const statusLabels: Record<string, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};

function ProfileInfo({ profile }: { profile: any }) {
  if (!profile) return <span className="text-muted-foreground text-sm">Usuário não encontrado</span>;
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={profile.avatar_url || ''} />
        <AvatarFallback className="text-xs">{profile.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium leading-tight">{profile.full_name}</p>
        {profile.company && <p className="text-xs text-muted-foreground">{profile.company}</p>}
      </div>
    </div>
  );
}

export default function AdminRegistros() {
  const { role, isLoading: loadingRole } = useAdmin();
  const [activeTab, setActiveTab] = useState('gente_em_acao');

  const deleteGA = useAdminDelete('gente_em_acao');
  const deleteTestimonials = useAdminDelete('testimonials');
  const deleteReferrals = useAdminDelete('referrals');
  const deleteDeals = useAdminDelete('business_deals');
  const deleteInvitations = useAdminDelete('invitations');

  if (loadingRole) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          Gestão de Registros
        </h1>
        <p className="text-muted-foreground">Gerencie todos os registros realizados na plataforma</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="gente_em_acao" className="text-xs sm:text-sm">Gente em Ação</TabsTrigger>
          <TabsTrigger value="testimonials" className="text-xs sm:text-sm">Depoimentos</TabsTrigger>
          <TabsTrigger value="referrals" className="text-xs sm:text-sm">Indicações</TabsTrigger>
          <TabsTrigger value="business_deals" className="text-xs sm:text-sm">Negócios</TabsTrigger>
          <TabsTrigger value="invitations" className="text-xs sm:text-sm">Convites</TabsTrigger>
        </TabsList>

        <TabsContent value="gente_em_acao" className="mt-4">
          <AdminDataView
            title="Gente em Ação"
            description="Todos os registros de Gente em Ação"
            icon={<Handshake className="w-6 h-6 text-primary" />}
            table="gente_em_acao"
            onDelete={(id) => deleteGA.mutate(id)}
            isDeleting={deleteGA.isPending}
            renderItem={(item, profiles) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProfileInfo profile={profiles[item.user_id]} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="text-sm font-medium">{item.guest_name || 'Membro'}</span>
                  {item.guest_company && <span className="text-xs text-muted-foreground">({item.guest_company})</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">{item.meeting_type}</Badge>
                  <span>{format(parseLocalDate(item.meeting_date), "dd/MM/yyyy")}</span>
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="testimonials" className="mt-4">
          <AdminDataView
            title="Depoimentos"
            description="Todos os depoimentos registrados"
            icon={<MessageSquare className="w-6 h-6 text-primary" />}
            table="testimonials"
            onDelete={(id) => deleteTestimonials.mutate(id)}
            isDeleting={deleteTestimonials.isPending}
            renderItem={(item, profiles) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProfileInfo profile={profiles[item.from_user_id]} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <ProfileInfo profile={profiles[item.to_user_id]} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">"{item.content}"</p>
                <span className="text-xs text-muted-foreground">
                  {item.created_at && format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <AdminDataView
            title="Indicações"
            description="Todas as indicações registradas"
            icon={<Send className="w-6 h-6 text-primary" />}
            table="referrals"
            onDelete={(id) => deleteReferrals.mutate(id)}
            isDeleting={deleteReferrals.isPending}
            renderItem={(item, profiles) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProfileInfo profile={profiles[item.from_user_id]} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <ProfileInfo profile={profiles[item.to_user_id]} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{item.contact_name}</span>
                  {item.status && (
                    <Badge variant="outline" className={`text-xs ${statusColors[item.status] || ''}`}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  )}
                </div>
                {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                <span className="text-xs text-muted-foreground">
                  {item.created_at && format(new Date(item.created_at), "dd/MM/yyyy")}
                </span>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="business_deals" className="mt-4">
          <AdminDataView
            title="Negócios"
            description="Todos os negócios fechados"
            icon={<DollarSign className="w-6 h-6 text-primary" />}
            table="business_deals"
            onDelete={(id) => deleteDeals.mutate(id)}
            isDeleting={deleteDeals.isPending}
            renderItem={(item, profiles) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProfileInfo profile={profiles[item.closed_by_user_id]} />
                  {item.referred_by_user_id && (
                    <>
                      <span className="text-muted-foreground text-xs">indicado por</span>
                      <ProfileInfo profile={profiles[item.referred_by_user_id]} />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {item.client_name && <span className="text-sm font-medium">{item.client_name}</span>}
                  <Badge variant="secondary" className="text-xs">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                  </Badge>
                </div>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                <span className="text-xs text-muted-foreground">
                  {format(parseLocalDate(item.deal_date), "dd/MM/yyyy")}
                </span>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <AdminDataView
            title="Convites"
            description="Todos os convites enviados"
            icon={<UserPlus className="w-6 h-6 text-primary" />}
            table="invitations"
            onDelete={(id) => deleteInvitations.mutate(id)}
            isDeleting={deleteInvitations.isPending}
            renderItem={(item, profiles) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProfileInfo profile={profiles[item.invited_by]} />
                  <span className="text-muted-foreground text-xs">convidou</span>
                  <span className="text-sm font-medium">{item.name || item.email || 'Sem nome'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.status === 'accepted' ? 'default' : item.status === 'expired' ? 'destructive' : 'outline'} className="text-xs">
                    {item.status === 'accepted' ? 'Aceito' : item.status === 'expired' ? 'Expirado' : 'Pendente'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.created_at && format(new Date(item.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
