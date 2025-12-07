import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/estatisticas': {
    title: 'Estatísticas',
    description: 'Relatórios e gráficos de performance da comunidade',
  },
  '/gente-em-acao': {
    title: 'Gente em Ação',
    description: 'Registre suas reuniões 1-a-1 com membros e convidados',
  },
  '/depoimentos': {
    title: 'Depoimentos',
    description: 'Testemunhos entre membros da comunidade',
  },
  '/negocios': {
    title: 'Negócios Realizados',
    description: 'Registre os negócios fechados através da rede',
  },
  '/indicacoes': {
    title: 'Indicações',
    description: 'Indicações de contatos entre membros',
  },
  '/equipes': {
    title: 'Equipes',
    description: 'Gerencie as equipes e grupos da comunidade',
  },
  '/encontros': {
    title: 'Encontros',
    description: 'Agenda e presenças dos encontros quinzenais',
  },
  '/conteudos': {
    title: 'Conteúdos',
    description: 'Materiais educativos e estratégicos',
  },
  '/admin': {
    title: 'Configurações',
    description: 'Administração do sistema',
  },
};

export default function Placeholder() {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || {
    title: 'Página',
    description: 'Esta página está em construção',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pageInfo.title}</h1>
        <p className="text-muted-foreground">{pageInfo.description}</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Construction className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Em Construção</h2>
            <p className="text-muted-foreground max-w-md">
              Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
              Fique ligado nas atualizações!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
