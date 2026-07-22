/**
 * AdminCrmAuditoria - Página de auditoria global do CRM (v3.25.0).
 * Admin-only. Timeline completa de eventos com filtros e exportação CSV.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollText, Download, ArrowLeft } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import {
  CRM_EVENT_LABEL,
  CRM_SOURCE_LABEL,
  useCrmAuditFeed,
} from '@/hooks/useCrmLeads';

export default function AdminCrmAuditoria() {
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { data, isLoading } = useCrmAuditFeed(500);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  if (!loadingRole && !isAdmin) return <Navigate to="/" replace />;

  const filtered = useMemo(() => {
    return (data ?? []).filter((row) => {
      if (eventFilter !== 'all' && row.event_type !== eventFilter) return false;
      if (sourceFilter !== 'all' && row.source_snapshot !== sourceFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hit =
          row.lead?.name?.toLowerCase().includes(s) ||
          row.lead?.email?.toLowerCase().includes(s) ||
          (row.moved_by_name ?? '').toLowerCase().includes(s) ||
          (row.reason ?? '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    });
  }, [data, search, eventFilter, sourceFilter]);

  const exportCsv = () => {
    const header = ['Data', 'Lead', 'Email', 'Evento', 'De', 'Para', 'Motivo', 'Origem', 'Por'];
    const rows = filtered.map((r) => [
      format(parseISO(r.created_at), 'dd/MM/yy HH:mm'),
      r.lead?.name ?? '',
      r.lead?.email ?? '',
      CRM_EVENT_LABEL[r.event_type] ?? r.event_type,
      r.from_status ?? '',
      r.to_status ?? '',
      (r.reason ?? '').replace(/[\r\n]+/g, ' '),
      r.source_snapshot ?? '',
      r.moved_by_name ?? (r.moved_by ? 'Usuário' : 'Sistema'),
    ]);
    const csv =
      [header, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-primary shrink-0" />
            <span className="text-wrap-anywhere">Auditoria do CRM</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Trilha completa de eventos: mudanças de status, contratos, promoções e notas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/crm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao CRM
            </Link>
          </Button>
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 grid sm:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por lead, email, motivo, usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {Object.entries(CRM_EVENT_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {Object.entries(CRM_SOURCE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {isLoading ? 'Carregando...' : `${filtered.length} evento(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {CRM_EVENT_LABEL[r.event_type] ?? r.event_type}
                      </Badge>
                      {r.source_snapshot && (
                        <Badge variant="outline" className="text-[10px]">
                          {CRM_SOURCE_LABEL[r.source_snapshot]}
                        </Badge>
                      )}
                      {r.from_status && r.to_status && r.from_status !== r.to_status && (
                        <span className="text-xs text-muted-foreground">
                          {r.from_status} → {r.to_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1 text-wrap-anywhere">
                      <span className="font-medium">{r.lead?.name ?? 'Lead removido'}</span>
                      {r.lead?.email && (
                        <span className="text-muted-foreground"> · {r.lead.email}</span>
                      )}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-muted-foreground text-wrap-anywhere">{r.reason}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                    <p>{r.moved_by_name ?? (r.moved_by ? 'Usuário' : 'Sistema')}</p>
                    <p>{format(parseISO(r.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
