import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PROXY_URL } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';

interface EndpointResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  httpStatus?: number;
  cacheHeader?: string;
  cacheTTL?: string;
  latency?: number;
  error?: string;
}

const TEST_ENDPOINTS = [
  { path: '/rest/v1/profiles?select=id&limit=1', label: 'Profiles' },
  { path: '/rest/v1/teams?select=id&limit=1', label: 'Teams' },
  { path: '/rest/v1/meetings?select=id&limit=1', label: 'Meetings' },
  { path: '/rest/v1/contents?select=id&limit=1', label: 'Contents' },
  { path: '/rest/v1/monthly_points?select=id&limit=1', label: 'Monthly Points' },
];

export default function AdminCacheDiagnostics() {
  const [results, setResults] = useState<EndpointResult[]>([]);
  const [testing, setTesting] = useState(false);

  const proxyUrl = PROXY_URL;

  const testEndpoints = async () => {
    if (!proxyUrl) return;
    setTesting(true);
    const newResults: EndpointResult[] = [];

    for (const endpoint of TEST_ENDPOINTS) {
      const start = performance.now();
      try {
        const res = await fetch(`${proxyUrl}${endpoint.path}`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            'Accept': 'application/json',
          },
        });
        const latency = Math.round(performance.now() - start);
        newResults.push({
          endpoint: endpoint.label,
          status: res.ok ? 'success' : 'error',
          httpStatus: res.status,
          cacheHeader: res.headers.get('X-Cache') || res.headers.get('cf-cache-status') || 'N/A',
          cacheTTL: res.headers.get('X-Cache-TTL') || res.headers.get('cache-control') || 'N/A',
          latency,
        });
      } catch (err) {
        newResults.push({
          endpoint: endpoint.label,
          status: 'error',
          latency: Math.round(performance.now() - start),
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    setResults(newResults);
    setTesting(false);
  };

  const getCacheBadge = (header?: string) => {
    if (!header || header === 'N/A') return <Badge variant="outline">N/A</Badge>;
    if (header.toUpperCase().includes('HIT')) return <Badge className="bg-green-100 text-green-800 border-green-300">HIT</Badge>;
    if (header.toUpperCase().includes('MISS')) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">MISS</Badge>;
    if (header.toUpperCase().includes('BYPASS')) return <Badge className="bg-red-100 text-red-800 border-red-300">BYPASS</Badge>;
    return <Badge variant="secondary">{header}</Badge>;
  };

  if (!proxyUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WifiOff className="w-5 h-5 text-muted-foreground" />
            Diagnóstico de Cache
          </CardTitle>
          <CardDescription>VITE_PROXY_URL não configurada. O proxy de cache não está ativo neste ambiente.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-primary" />
              Diagnóstico de Cache (Cloudflare Worker)
            </CardTitle>
            <CardDescription className="mt-1">
              Proxy URL: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{proxyUrl}</code>
            </CardDescription>
          </div>
          <Button onClick={testEndpoints} disabled={testing} size="sm">
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Testar Cache
          </Button>
        </div>
      </CardHeader>
      {results.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.endpoint} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-3">
                  {r.status === 'success' ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-destructive" />
                  )}
                  <span className="font-medium">{r.endpoint}</span>
                  <Badge variant="outline" className="text-xs">
                    {r.httpStatus || 'ERR'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {getCacheBadge(r.cacheHeader)}
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {r.latency}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> HIT = Servido do cache
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> MISS = Buscado na origem
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" /> BYPASS = Sem cache
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
