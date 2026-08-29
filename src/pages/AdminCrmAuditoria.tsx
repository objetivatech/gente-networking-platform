/**
 * AdminCrmAuditoria - Auditoria global do CRM com filtros e exportação CSV/PDF (v3.27.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollText, Download, ArrowLeft, FileText } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import {
  CRM_EVENT_LABEL,
  CRM_SOURCE_LABEL,
  CRM_STATUS_LABEL,
  CRM_STATUS_ORDER,
  useCrmAuditFeed,
} from '@/hooks/useCrmLeads';
import {
  useCrmIdentityMetrics,
  useIdentityBlocks,
  useLeadMerges,
} from '@/hooks/useCrmIdentity';

export default function AdminCrmAuditoria() {
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { data, isLoading } = useCrmAuditFeed(500);
  const { data: metrics } = useCrmIdentityMetrics();
  const { data: merges, isLoading: loadingMerges } = useLeadMerges(300);
  const { data: blocks, isLoading: loadingBlocks } = useIdentityBlocks(300);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [fromStatus, setFromStatus] = useState('all');
  const [toStatus, setToStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!loadingRole && !isAdmin) return <Navigate to="/" replace />;

  const filtered = useMemo(() => {
    const df = dateFrom ? new Date(dateFrom) : null;
    const dt = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return (data ?? []).filter((row) => {
      if (eventFilter !== 'all' && row.event_type !== eventFilter) return false;
      if (sourceFilter !== 'all' && row.source_snapshot !== sourceFilter) return false;
      if (fromStatus !== 'all' && row.from_status !== fromStatus) return false;
      if (toStatus !== 'all' && row.to_status !== toStatus) return false;
      const created = parseISO(row.created_at);
      if (df && isBefore(created, df)) return false;
      if (dt && isAfter(created, dt)) return false;
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
  }, [data, search, eventFilter, sourceFilter, fromStatus, toStatus, dateFrom, dateTo]);

  const buildRows = () =>
    filtered.map((r) => [
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

  const header = ['Data', 'Lead', 'Email', 'Evento', 'De', 'Para', 'Motivo', 'Origem', 'Por'];

  const exportCsv = () => {
    const rows = buildRows();
    const csv = [header, ...rows]
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

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Auditoria do CRM — Gente Networking', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(120);
    const filtersSummary = [
      `Emitido em ${format(new Date(), 'dd/MM/yy HH:mm')}`,
      dateFrom || dateTo ? `Período: ${dateFrom || '...'} → ${dateTo || '...'}` : null,
      eventFilter !== 'all' ? `Evento: ${CRM_EVENT_LABEL[eventFilter] ?? eventFilter}` : null,
      sourceFilter !== 'all' ? `Origem: ${CRM_SOURCE_LABEL[sourceFilter as never] ?? sourceFilter}` : null,
      fromStatus !== 'all' ? `De: ${CRM_STATUS_LABEL[fromStatus as never] ?? fromStatus}` : null,
      toStatus !== 'all' ? `Para: ${CRM_STATUS_LABEL[toStatus as never] ?? toStatus}` : null,
      `Total: ${filtered.length} evento(s)`,
    ].filter(Boolean).join(' · ');
    doc.text(filtersSummary, 14, 20);
    autoTable(doc, {
      head: [header],
      body: buildRows(),
      startY: 26,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95] },
      columnStyles: { 6: { cellWidth: 60 } },
    });
    doc.save(`crm-auditoria-${new Date().toISOString().slice(0, 10)}.pdf`);
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
            Trilha completa de eventos: mudanças de status, contratos, promoções, cobrança HUB e notas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/crm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao CRM
            </Link>
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={exportPdf} disabled={!filtered.length}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Métricas de identidade única (v3.47.0) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Bloqueios (7 dias)" value={metrics?.blocked7} hint="já é membro" />
        <MetricCard title="Bloqueios (30 dias)" value={metrics?.blocked30} hint={`total ${metrics?.blockedTotal ?? 0}`} />
        <MetricCard title="Fusões (7 dias)" value={metrics?.merged7} hint="contatos unificados" />
        <MetricCard title="Fusões (30 dias)" value={metrics?.merged30} hint={`total ${metrics?.mergedTotal ?? 0}`} />
      </div>

      <Tabs defaultValue="eventos">
        <TabsList className="hscroll">
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="fusoes">Fusões de contatos</TabsTrigger>
          <TabsTrigger value="bloqueios">Bloqueios na origem</TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="space-y-6 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Buscar por lead, email, motivo, usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:col-span-2"
          />
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {Object.entries(CRM_EVENT_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
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
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fromStatus} onValueChange={setFromStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status anterior" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer status anterior</SelectItem>
              {CRM_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{CRM_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toStatus} onValueChange={setToStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status novo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer status novo</SelectItem>
              {CRM_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{CRM_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <label className="text-[11px] text-muted-foreground">De</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Até</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
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
        </TabsContent>

        <TabsContent value="fusoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {loadingMerges ? 'Carregando...' : `${merges?.length ?? 0} fusão(ões) de contatos`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(merges ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fusão registrada.</p>
              ) : (
                <ul className="divide-y">
                  {(merges ?? []).map((m) => (
                    <li key={m.id} className="py-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">Contatos unificados</Badge>
                        {m.merged_archived && (
                          <Badge variant="outline" className="text-[10px]">Duplicado arquivado</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(m.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-wrap-anywhere">
                        <span className="font-medium">Principal:</span>{' '}
                        {m.keep?.name ?? 'Contato removido'}
                        {m.keep?.email && <span className="text-muted-foreground"> · {m.keep.email}</span>}
                        {m.keep?.phone && <span className="text-muted-foreground"> · {m.keep.phone}</span>}
                      </p>
                      <p className="text-sm text-wrap-anywhere">
                        <span className="font-medium">Duplicado:</span>{' '}
                        {m.merged_email ?? '—'}
                        {m.merged_phone && <span className="text-muted-foreground"> · {m.merged_phone}</span>}
                      </p>
                      {m.reason && (
                        <p className="text-xs text-muted-foreground text-wrap-anywhere">{m.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Histórico migrado: presenças, assinaturas, cobranças, resgates e eventos ·{' '}
                        {m.moved_by_name ?? (m.moved_by ? 'Usuário' : 'Sistema')}
                      </p>
                      {m.keep?.id && (
                        <Button variant="link" size="sm" asChild className="px-0 h-auto">
                          <Link to="/admin/crm">Abrir contato principal no CRM</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {loadingBlocks ? 'Carregando...' : `${blocks?.length ?? 0} bloqueio(s) na origem`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(blocks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cadastro bloqueado por já ser membro.
                </p>
              ) : (
                <ul className="divide-y">
                  {(blocks ?? []).map((b) => (
                    <li key={b.id} className="py-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">Já é membro</Badge>
                        {b.source && (
                          <Badge variant="outline" className="text-[10px]">
                            {CRM_SOURCE_LABEL[b.source as never] ?? b.source}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(b.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-wrap-anywhere">
                        {b.email ?? '—'}
                        {b.phone_digits && (
                          <span className="text-muted-foreground"> · {b.phone_digits}</span>
                        )}
                      </p>
                      {b.page_key && (
                        <p className="text-xs text-muted-foreground text-wrap-anywhere">
                          {b.page_key}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, hint }: { title: string; value?: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground text-wrap-anywhere">{title}</p>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
