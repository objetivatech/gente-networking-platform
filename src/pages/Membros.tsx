/**
 * @page Membros
 * @route /membros
 * @description Diretório de membros para consulta de perfis, organizado por equipes
 * 
 * @features
 * - Lista de membros agrupados por equipe
 * - Busca por nome, empresa e segmento
 * - Filtros avançados por equipe, segmento e rank
 * - Exportação para PDF e Excel
 * - Visualização de perfis completos
 * - Excluí convidados automaticamente
 * 
 * @access Apenas membros (não convidados)
 * @since 2024-12-08
 */

import { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  UsersRound,
  Filter,
  X,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

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
  slug?: string | null;
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

interface TeamSectionProps {
  team: MembersByTeam;
  search: string;
  segmentFilter: string;
  rankFilter: string;
  onViewProfile: (memberId: string) => void;
}

function TeamSection({ team, search, segmentFilter, rankFilter, onViewProfile }: TeamSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const filteredMembers = team.members.filter(member => {
    // Text search
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        member.full_name.toLowerCase().includes(searchLower) ||
        member.company?.toLowerCase().includes(searchLower) ||
        member.business_segment?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Segment filter
    if (segmentFilter && segmentFilter !== 'all') {
      if (member.business_segment !== segmentFilter) return false;
    }
    
    // Rank filter
    if (rankFilter && rankFilter !== 'all') {
      if (member.rank !== rankFilter) return false;
    }
    
    return true;
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
            <MemberCard 
              key={member.id}
              member={member as MemberProfile} 
              onViewProfile={() => onViewProfile(member.slug || member.id)} 
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const RANK_LABELS: Record<string, string> = {
  iniciante: 'Iniciante',
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  diamante: 'Diamante',
};

export default function Membros() {
  const navigate = useNavigate();
  const { members, membersByTeam, isLoading } = useMembers();
  const { isGuest, isLoading: isLoadingRole } = useAdmin();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');

  const handleViewProfile = (memberSlug: string) => {
    navigate(`/membro/${memberSlug}`);
  };

  // Extract unique segments and teams for filters
  const { uniqueSegments, uniqueTeams, uniqueRanks } = useMemo(() => {
    if (!members) return { uniqueSegments: [], uniqueTeams: [], uniqueRanks: [] };
    
    const segments = new Set<string>();
    const ranks = new Set<string>();
    
    members.forEach(m => {
      if (m.business_segment) segments.add(m.business_segment);
      if (m.rank) ranks.add(m.rank);
    });
    
    const teams = membersByTeam
      .filter(t => t.team_id !== null)
      .map(t => ({ id: t.team_id!, name: t.team_name, color: t.team_color }));
    
    return {
      uniqueSegments: Array.from(segments).sort(),
      uniqueTeams: teams,
      uniqueRanks: ['iniciante', 'bronze', 'prata', 'ouro', 'diamante'].filter(r => ranks.has(r)),
    };
  }, [members, membersByTeam]);

  // Filter members by team filter (other filters are handled in TeamSection)
  const filteredMembersByTeam = useMemo(() => {
    if (teamFilter === 'all') return membersByTeam;
    if (teamFilter === 'no-team') return membersByTeam.filter(t => t.team_id === null);
    return membersByTeam.filter(t => t.team_id === teamFilter);
  }, [membersByTeam, teamFilter]);

  // Count filtered members
  const filteredCount = useMemo(() => {
    let count = 0;
    filteredMembersByTeam.forEach(team => {
      team.members.forEach(member => {
        // Text search
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            member.full_name.toLowerCase().includes(searchLower) ||
            member.company?.toLowerCase().includes(searchLower) ||
            member.business_segment?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return;
        }
        
        // Segment filter
        if (segmentFilter !== 'all' && member.business_segment !== segmentFilter) return;
        
        // Rank filter
        if (rankFilter !== 'all' && member.rank !== rankFilter) return;
        
        count++;
      });
    });
    return count;
  }, [filteredMembersByTeam, search, segmentFilter, rankFilter]);

  // Get all filtered members for export
  const getFilteredMembers = (): Member[] => {
    const result: Member[] = [];
    filteredMembersByTeam.forEach(team => {
      team.members.forEach(member => {
        // Text search
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            member.full_name.toLowerCase().includes(searchLower) ||
            member.company?.toLowerCase().includes(searchLower) ||
            member.business_segment?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return;
        }
        
        // Segment filter
        if (segmentFilter !== 'all' && member.business_segment !== segmentFilter) return;
        
        // Rank filter
        if (rankFilter !== 'all' && member.rank !== rankFilter) return;
        
        result.push(member);
      });
    });
    return result;
  };

  const hasActiveFilters = teamFilter !== 'all' || segmentFilter !== 'all' || rankFilter !== 'all' || search !== '';

  const clearFilters = () => {
    setSearch('');
    setTeamFilter('all');
    setSegmentFilter('all');
    setRankFilter('all');
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const filteredMembers = getFilteredMembers();
      
      const data = filteredMembers.map(m => ({
        'Nome': m.full_name,
        'Email': m.email || '',
        'Telefone': m.phone || '',
        'Empresa': m.company || '',
        'Cargo': m.position || '',
        'Segmento': m.business_segment || '',
        'Equipe': m.team_name || 'Sem Equipe',
        'Rank': m.rank ? RANK_LABELS[m.rank] || m.rank : '',
        'Pontos': m.points || 0,
        'LinkedIn': m.linkedin_url || '',
        'Instagram': m.instagram_url || '',
        'Website': m.website_url || '',
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Membros');
      
      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row]).length))
      }));
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, `membros-comunidade-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Lista exportada para Excel!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erro ao exportar para Excel');
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const filteredMembers = getFilteredMembers();
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Diretório de Membros', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(128);
      doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      doc.text(`Total: ${filteredMembers.length} membros`, 14, 36);
      
      // Table data
      const tableData = filteredMembers.map(m => [
        m.full_name,
        m.company || '-',
        m.phone || '-',
        m.email || '-',
        m.team_name || 'Sem Equipe',
        m.rank ? RANK_LABELS[m.rank] || m.rank : '-',
      ]);
      
      // @ts-ignore - jspdf-autotable adds this method
      doc.autoTable({
        startY: 42,
        head: [['Nome', 'Empresa', 'Telefone', 'Email', 'Equipe', 'Rank']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      doc.save(`membros-comunidade-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Lista exportada para PDF!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Erro ao exportar para PDF');
    }
  };

  // Convidados não têm acesso
  if (!isLoadingRole && isGuest) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Diretório de Membros</h1>
            <p className="text-muted-foreground">Conheça os membros da comunidade</p>
          </div>
        </div>
        
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar para Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar para PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou segmento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>
          
          {/* Team Filter */}
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {uniqueTeams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="no-team">Sem Equipe</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Segment Filter */}
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {uniqueSegments.map(segment => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Rank Filter */}
          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ranks</SelectItem>
              {uniqueRanks.map(rank => (
                <SelectItem key={rank} value={rank}>
                  {RANK_LABELS[rank] || rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
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
      ) : filteredMembersByTeam.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'Nenhum membro encontrado com esses critérios' : 'Nenhum membro cadastrado'}
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMembersByTeam.map(team => (
            <TeamSection 
              key={team.team_id || 'no-team'} 
              team={team} 
              search={search}
              segmentFilter={segmentFilter}
              rankFilter={rankFilter}
              onViewProfile={handleViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
