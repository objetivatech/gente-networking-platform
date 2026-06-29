import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Trash2, Filter, Search, Calendar, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';
import { exportRowsToExcel, exportRowsToPDF, type ExportColumn } from '@/lib/export-utils';

interface AdminDataViewProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  table: 'gente_em_acao' | 'testimonials' | 'referrals' | 'business_deals' | 'invitations';
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  renderItem: (item: any, profiles: Record<string, any>) => React.ReactNode;
}

export default function AdminDataView({ title, description, icon, table, onDelete, isDeleting, renderItem }: AdminDataViewProps) {
  const { teams } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Fetch all data for the table
  const { data: records, isLoading } = useQuery({
    queryKey: ['admin-data', table, selectedTeam, periodStart, periodEnd],
    queryFn: async () => {
      let query = supabase.from(table).select('*').order('created_at', { ascending: false });
      
      // Date filters based on table
      const dateColumn = table === 'gente_em_acao' ? 'meeting_date' : table === 'business_deals' ? 'deal_date' : 'created_at';
      if (periodStart) query = query.gte(dateColumn, periodStart);
      if (periodEnd) query = query.lte(dateColumn, periodEnd + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch team members to filter by team
  const { data: teamMembersMap } = useQuery({
    queryKey: ['team-members-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('user_id, team_id');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      data?.forEach(tm => {
        if (!map[tm.user_id]) map[tm.user_id] = [];
        map[tm.user_id].push(tm.team_id);
      });
      return map;
    },
  });

  // Fetch all profiles for display
  const { data: profilesMap } = useQuery({
    queryKey: ['all-profiles-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, company, avatar_url, email');
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach(p => { map[p.id] = p; });
      return map;
    },
  });

  // Filter records by team
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    let filtered = records;

    if (selectedTeam !== 'all' && teamMembersMap) {
      const userIdField = table === 'referrals' ? 'from_user_id' : table === 'testimonials' ? 'from_user_id' : table === 'business_deals' ? 'closed_by_user_id' : table === 'invitations' ? 'invited_by' : 'user_id';
      filtered = filtered.filter(r => {
        const userId = r[userIdField];
        return teamMembersMap[userId]?.includes(selectedTeam);
      });
    }

    if (searchQuery && profilesMap) {
      const q = searchQuery.toLowerCase();
      const userIdField = table === 'referrals' ? 'from_user_id' : table === 'testimonials' ? 'from_user_id' : table === 'business_deals' ? 'closed_by_user_id' : table === 'invitations' ? 'invited_by' : 'user_id';
      filtered = filtered.filter(r => {
        const profile = profilesMap[r[userIdField]];
        const rec = r as any;
        return profile?.full_name?.toLowerCase().includes(q) || 
               profile?.company?.toLowerCase().includes(q) ||
               rec.contact_name?.toLowerCase().includes(q) ||
               rec.guest_name?.toLowerCase().includes(q) ||
               rec.client_name?.toLowerCase().includes(q) ||
               rec.content?.toLowerCase().includes(q);
      });
    }

    return filtered;
  }, [records, selectedTeam, searchQuery, teamMembersMap, profilesMap, table]);

  // Configuração de colunas de exportação por tipo de tabela
  const exportColumns = useMemo<ExportColumn<any>[]>(() => {
    const profiles = profilesMap || {};
    const dateOf = (r: any) =>
      r.meeting_date ? format(parseLocalDate(r.meeting_date), 'dd/MM/yyyy')
      : r.deal_date ? format(parseLocalDate(r.deal_date), 'dd/MM/yyyy')
      : r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '';

    switch (table) {
      case 'referrals':
        return [
          { header: 'De', value: (r) => profiles[r.from_user_id]?.full_name || '' },
          { header: 'Para', value: (r) => profiles[r.to_user_id]?.full_name || '' },
          { header: 'Contato', value: (r) => r.contact_name || '' },
          { header: 'Telefone', value: (r) => r.contact_phone || '' },
          { header: 'Email', value: (r) => r.contact_email || '' },
          { header: 'Status', value: (r) => r.status || '' },
          { header: 'Notas', value: (r) => r.notes || '' },
          { header: 'Data', value: dateOf },
        ];
      case 'business_deals':
        return [
          { header: 'Fechado por', value: (r) => profiles[r.closed_by_user_id]?.full_name || '' },
          { header: 'Indicado por', value: (r) => profiles[r.referred_by_user_id]?.full_name || '' },
          { header: 'Cliente', value: (r) => r.client_name || '' },
          { header: 'Valor (R$)', value: (r) => Number(r.value || 0).toFixed(2) },
          { header: 'Descrição', value: (r) => r.description || '' },
          { header: 'Data', value: dateOf },
        ];
      case 'gente_em_acao':
        return [
          { header: 'Membro', value: (r) => profiles[r.user_id]?.full_name || '' },
          { header: 'Parceiro', value: (r) => profiles[r.partner_id]?.full_name || r.guest_name || '' },
          { header: 'Notas', value: (r) => r.notes || '' },
          { header: 'Data', value: dateOf },
        ];
      case 'testimonials':
        return [
          { header: 'De', value: (r) => profiles[r.from_user_id]?.full_name || '' },
          { header: 'Para', value: (r) => profiles[r.to_user_id]?.full_name || '' },
          { header: 'Conteúdo', value: (r) => r.content || '' },
          { header: 'Data', value: dateOf },
        ];
      case 'invitations':
        return [
          { header: 'Convidado por', value: (r) => profiles[r.invited_by]?.full_name || '' },
          { header: 'Nome', value: (r) => r.name || '' },
          { header: 'Email', value: (r) => r.email || '' },
          { header: 'Status', value: (r) => r.status || '' },
          { header: 'Data', value: dateOf },
        ];
      default:
        return [{ header: 'Data', value: dateOf }];
    }
  }, [table, profilesMap]);

  const fileBase = `${table}-${selectedTeam !== 'all' ? 'grupo' : 'todos'}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
        </Badge>
        {filteredRecords.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportRowsToExcel(filteredRecords, exportColumns, { fileName: fileBase, sheetName: title })}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportRowsToPDF(filteredRecords, exportColumns, { fileName: fileBase, title })}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {teams?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-36"
                placeholder="De"
              />
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-36"
                placeholder="Até"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !filteredRecords.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    {renderItem(item, profilesMap || {})}
                  </div>
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(item.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
