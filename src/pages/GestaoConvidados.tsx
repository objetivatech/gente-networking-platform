import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdminGuests, GuestRecord } from '@/hooks/useAdminGuests';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle,
  UserCheck,
  ArrowUpRight
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate, useNavigate } from 'react-router-dom';

export default function GestaoConvidados() {
  const { isAdmin, isFacilitator, isLoading: isLoadingRole } = useAdmin();
  const { guestRecords, members, isLoading } = useAdminGuests();
  const navigate = useNavigate();

  // Filtros
  const [search, setSearch] = useState('');
  const [inviterFilter, setInviterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [becameMemberFilter, setBecameMemberFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Verificar permissão
  if (!isLoadingRole && !isAdmin && !isFacilitator) {
    return <Navigate to="/" replace />;
  }

  // Aplicar filtros
  const filteredRecords = guestRecords?.filter(record => {
    // Busca por nome
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesGuest = record.guest?.full_name?.toLowerCase().includes(searchLower) ||
                          record.invitation.name?.toLowerCase().includes(searchLower) ||
                          record.invitation.email?.toLowerCase().includes(searchLower);
      const matchesInviter = record.inviter.full_name.toLowerCase().includes(searchLower);
      if (!matchesGuest && !matchesInviter) return false;
    }

    // Filtro por membro que convidou
    if (inviterFilter !== 'all' && record.inviter.id !== inviterFilter) return false;

    // Filtro por status
    if (statusFilter !== 'all' && record.invitation.status !== statusFilter) return false;

    // Filtro por se tornou membro
    if (becameMemberFilter === 'yes' && !record.becameMember) return false;
    if (becameMemberFilter === 'no' && record.becameMember) return false;
    if (becameMemberFilter === 'pending' && record.invitation.status !== 'pending') return false;

    // Filtro por período
    if (dateFrom || dateTo) {
      const inviteDate = parseISO(record.invitation.created_at);
      const from = dateFrom ? parseISO(dateFrom) : new Date(0);
      const to = dateTo ? parseISO(dateTo) : new Date();
      to.setHours(23, 59, 59, 999);
      if (!isWithinInterval(inviteDate, { start: from, end: to })) return false;
    }

    return true;
  }) || [];

  // Estatísticas
  const stats = {
    total: guestRecords?.length || 0,
    pending: guestRecords?.filter(r => r.invitation.status === 'pending').length || 0,
    accepted: guestRecords?.filter(r => r.invitation.status === 'accepted').length || 0,
    becameMember: guestRecords?.filter(r => r.becameMember).length || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'accepted':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Aceito</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Expirado</Badge>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500">Admin</Badge>;
      case 'facilitador':
        return <Badge className="bg-blue-500">Facilitador</Badge>;
      case 'membro':
        return <Badge className="bg-green-500">Membro</Badge>;
      case 'convidado':
        return <Badge variant="secondary">Convidado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-primary" />
            Gestão de Convidados
          </h1>
          <p className="text-muted-foreground">Acompanhe os convites realizados e a conversão de convidados</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total de Convites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-sm text-muted-foreground">Aceitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{stats.becameMember}</p>
            <p className="text-sm text-muted-foreground">Tornaram-se Membros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Membro que convidou */}
            <Select value={inviterFilter} onValueChange={setInviterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Convidado por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {members?.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status do convite */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status do convite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="accepted">Aceito</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>

            {/* Se tornou membro */}
            <Select value={becameMemberFilter} onValueChange={setBecameMemberFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Conversão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as conversões</SelectItem>
                <SelectItem value="yes">Tornou-se membro</SelectItem>
                <SelectItem value="no">Ainda convidado</SelectItem>
                <SelectItem value="pending">Pendente (não aceitou)</SelectItem>
              </SelectContent>
            </Select>

            {/* Período */}
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                placeholder="De"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                placeholder="Até"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Botão limpar filtros */}
          {(search || inviterFilter !== 'all' || statusFilter !== 'all' || becameMemberFilter !== 'all' || dateFrom || dateTo) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-4"
              onClick={() => {
                setSearch('');
                setInviterFilter('all');
                setStatusFilter('all');
                setBecameMemberFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lista de Convites */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Convites</CardTitle>
          <CardDescription>
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''} encontrado{filteredRecords.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-lg bg-muted">
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado</p>
              <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.invitation.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Convidado */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar>
                      <AvatarImage src={record.guest?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(record.guest?.full_name || record.invitation.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {record.guest?.full_name || record.invitation.name || 'Não informado'}
                        </p>
                        {getStatusBadge(record.invitation.status)}
                        {record.guestRole && getRoleBadge(record.guestRole)}
                        {record.becameMember && (
                          <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                            <UserCheck className="h-3 w-3" />
                            Convertido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {record.guest?.email || record.invitation.email || 'Email não informado'}
                        {record.guest?.company && ` • ${record.guest.company}`}
                      </p>
                    </div>
                  </div>

                  {/* Convidado por */}
                  <div className="flex items-center gap-2 lg:w-48 shrink-0">
                    <span className="text-xs text-muted-foreground">Convidado por:</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={record.inviter.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {record.inviter.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{record.inviter.full_name}</span>
                    </div>
                  </div>

                  {/* Data */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:w-40 shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span>{format(parseISO(record.invitation.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>

                   {/* Ação */}
                   {record.guest && (
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => navigate(`/membro/${record.guest?.slug || record.guest?.id}`)}
                     >
                       <ArrowUpRight className="h-4 w-4" />
                     </Button>
                   )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
