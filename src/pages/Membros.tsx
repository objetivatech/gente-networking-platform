/**
 * @page Membros
 * @route /membros
 * @description Diretório de membros para consulta de perfis, organizado por equipes
 * 
 * @features
 * - Lista de membros agrupados por equipe
 * - Busca por nome, empresa e segmento
 * - Visualização de perfis completos
 * - Excluí convidados automaticamente
 * 
 * @access Apenas membros (não convidados)
 * @since 2024-12-08
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMembers, Member, MembersByTeam } from '@/hooks/useMembers';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import RankBadge from '@/components/RankBadge';
import { 
  Users, 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Linkedin, 
  Instagram,
  Briefcase,
  User,
  ExternalLink,
  ChevronDown,
  UsersRound
} from 'lucide-react';

interface MemberProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  business_segment: string | null;
  points: number | null;
  rank: string | null;
  team_name?: string | null;
  team_color?: string | null;
}

function MemberCard({ member, onViewProfile }: { member: MemberProfile; onViewProfile: () => void }) {
  const initials = member.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{member.full_name}</h3>
              {member.rank && (
                <RankBadge rank={member.rank as any} size="sm" />
              )}
            </div>
            
            {member.position && (
              <p className="text-sm text-muted-foreground truncate">{member.position}</p>
            )}
            
            {member.company && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{member.company}</span>
              </div>
            )}
            
            {member.business_segment && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {member.business_segment}
              </Badge>
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={onViewProfile}
        >
          <User className="h-4 w-4 mr-2" />
          Ver Perfil
        </Button>
      </CardContent>
    </Card>
  );
}

function MemberProfileModal({ member }: { member: MemberProfile }) {
  const initials = member.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{member.full_name}</h2>
            {member.rank && <RankBadge rank={member.rank as any} />}
          </div>
          {member.position && (
            <p className="text-muted-foreground">{member.position}</p>
          )}
          {member.company && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <Building2 className="h-4 w-4" />
              <span>{member.company}</span>
            </div>
          )}
        </div>
      </div>

      {/* Equipe */}
      {member.team_name && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Equipe</h4>
          <Badge 
            variant="outline" 
            style={{ borderColor: member.team_color || undefined, color: member.team_color || undefined }}
          >
            <UsersRound className="h-3 w-3 mr-1" />
            {member.team_name}
          </Badge>
        </div>
      )}

      {/* Segmento */}
      {member.business_segment && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Segmento</h4>
          <Badge variant="secondary">{member.business_segment}</Badge>
        </div>
      )}

      {/* Bio */}
      {member.bio && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Sobre</h4>
          <p className="text-sm">{member.bio}</p>
        </div>
      )}

      {/* Contato */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
        
        {member.email && (
          <a 
            href={`mailto:${member.email}`}
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4" />
            {member.email}
          </a>
        )}
        
        {member.phone && (
          <a 
            href={`https://wa.me/55${member.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            {member.phone}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Links */}
      {(member.linkedin_url || member.instagram_url || member.website_url) && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Links</h4>
          
          {member.linkedin_url && (
            <a 
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          
          {member.instagram_url && (
            <a 
              href={member.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              Instagram
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          
          {member.website_url && (
            <a 
              href={member.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Globe className="h-4 w-4" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Pontos */}
      {member.points !== null && member.points > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pontuação</span>
            <span className="font-semibold text-primary">{member.points} pontos</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamSection({ team, search }: { team: MembersByTeam; search: string }) {
  const [isOpen, setIsOpen] = useState(true);

  const filteredMembers = team.members.filter(member => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.company?.toLowerCase().includes(searchLower) ||
      member.business_segment?.toLowerCase().includes(searchLower)
    );
  });

  if (filteredMembers.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between h-auto py-3 px-4 mb-2"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: team.team_color }}
            />
            <span className="font-semibold text-lg">{team.team_name}</span>
            <Badge variant="secondary" className="ml-2">
              {filteredMembers.length} {filteredMembers.length === 1 ? 'membro' : 'membros'}
            </Badge>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
          {filteredMembers.map(member => (
            <Dialog key={member.id}>
              <DialogTrigger asChild>
                <div>
                  <MemberCard 
                    member={member as MemberProfile} 
                    onViewProfile={() => {}} 
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Perfil do Membro</DialogTitle>
                </DialogHeader>
                <MemberProfileModal member={member as MemberProfile} />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Membros() {
  const { members, membersByTeam, isLoading } = useMembers();
  const { isGuest, isLoading: isLoadingRole } = useAdmin();
  const [search, setSearch] = useState('');

  // Convidados não têm acesso
  if (!isLoadingRole && isGuest) {
    return <Navigate to="/" replace />;
  }

  // Count filtered members
  const filteredCount = members?.filter(member => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.company?.toLowerCase().includes(searchLower) ||
      member.business_segment?.toLowerCase().includes(searchLower)
    );
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Diretório de Membros</h1>
          <p className="text-muted-foreground">Conheça os membros da comunidade</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, empresa ou segmento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Briefcase className="h-4 w-4" />
        <span>{filteredCount} membros encontrados</span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : membersByTeam.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? 'Nenhum membro encontrado com esses critérios' : 'Nenhum membro cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {membersByTeam.map(team => (
            <TeamSection key={team.team_id || 'no-team'} team={team} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}
