import { useState } from 'react';
import { useBusinessDeals } from '@/hooks/useBusinessDeals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MemberSelect from '@/components/MemberSelect';
import { Loader2, Plus, DollarSign, TrendingUp, Award, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';

const formSchema = z.object({
  referred_by_user_id: z.string().optional(),
  client_name: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  value: z.number().min(0.01, 'Valor deve ser maior que zero'),
  deal_date: z.string().min(1, 'Data é obrigatória'),
});

export default function Negocios() {
  const { myDeals, referredDeals, isLoading, createDeal, deleteDeal } = useBusinessDeals();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    referred_by_user_id: '',
    client_name: '',
    description: '',
    value: '',
    deal_date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsedValue = parseFloat(formData.value.replace(',', '.'));
    const result = formSchema.safeParse({
      ...formData,
      value: parsedValue,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    await createDeal.mutateAsync({
      ...formData,
      referred_by_user_id: formData.referred_by_user_id || undefined,
      value: parsedValue,
    });
    setOpen(false);
    setFormData({
      referred_by_user_id: '',
      client_name: '',
      description: '',
      value: '',
      deal_date: new Date().toISOString().split('T')[0],
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalMyDeals = myDeals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const totalReferredDeals = referredDeals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const DealCard = ({ deal, type }: { deal: any; type: 'my' | 'referred' }) => {
    const showReferrer = type === 'my' && deal.referred_by;
    const showCloser = type === 'referred' && deal.closed_by;

    return (
      <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-primary">{formatCurrency(Number(deal.value))}</span>
              {deal.client_name && (
                <span className="text-sm text-muted-foreground">• {deal.client_name}</span>
              )}
            </div>
            {deal.description && (
              <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(deal.deal_date), "dd/MM/yyyy", { locale: ptBR })}
              </div>
              {showReferrer && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Indicação de:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={deal.referred_by.avatar_url || ''} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(deal.referred_by.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{deal.referred_by.full_name}</span>
                  </div>
                </div>
              )}
              {showCloser && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Fechado por:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={deal.closed_by.avatar_url || ''} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(deal.closed_by.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{deal.closed_by.full_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {type === 'my' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteDeal.mutate(deal.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Negócios Realizados
          </h1>
          <p className="text-muted-foreground">Registre os negócios fechados pela rede</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Negócio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                  {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal_date">Data</Label>
                  <Input
                    id="deal_date"
                    type="date"
                    value={formData.deal_date}
                    onChange={(e) => setFormData({ ...formData, deal_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">Nome do Cliente (opcional)</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome do cliente ou empresa"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Quem indicou? (opcional)</Label>
                <MemberSelect
                  value={formData.referred_by_user_id}
                  onChange={(v) => setFormData({ ...formData, referred_by_user_id: v })}
                  placeholder="Selecione o membro que indicou"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre o negócio..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createDeal.isPending}>
                {createDeal.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Registrar Negócio'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalMyDeals)}</p>
              <p className="text-sm text-green-600/80">Meus Negócios</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalReferredDeals)}</p>
              <p className="text-sm text-blue-600/80">Minhas Indicações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{myDeals?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Negócios Fechados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{referredDeals?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Indicações Convertidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Meus Negócios
          </TabsTrigger>
          <TabsTrigger value="referred" className="flex items-center gap-2">
            <Award className="w-4 h-4" /> Minhas Indicações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Negócios que Fechei</CardTitle>
              <CardDescription>Negócios realizados por você</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !myDeals?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum negócio registrado ainda</p>
                  <p className="text-sm">Clique em "Novo Negócio" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} type="my" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referred" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Negócios que Indiquei</CardTitle>
              <CardDescription>Negócios fechados através das suas indicações</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !referredDeals?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma indicação convertida ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referredDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} type="referred" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
