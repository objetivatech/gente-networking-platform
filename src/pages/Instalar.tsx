import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Share, 
  MoreVertical, 
  PlusSquare, 
  Check, 
  Smartphone,
  Monitor,
  Wifi,
  Bell,
  Zap
} from 'lucide-react';
import logoGente from '@/assets/logo-gente.png';

export default function Instalar() {
  const { isInstallable, isInstalled, isIOS, isAndroid, isStandalone, promptInstall } = usePWAInstall();

  // Already installed or running in standalone
  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                <img src={logoGente} alt="Gente Networking" className="w-20 h-20 object-contain" />
              </div>
              <CardTitle className="text-2xl text-primary">App Instalado!</CardTitle>
              <CardDescription>
                O Gente Networking já está instalado no seu dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Instalação completa</span>
              </div>
              <Button className="mt-6 w-full" onClick={() => window.location.href = '/'}>
                Ir para o App
              </Button>
            </CardContent>
          </Card>
        </div>

        <footer className="border-t border-border bg-card py-4 px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm text-muted-foreground">
              © 2026. Criado e operado com{' '}
              <strong className="text-destructive">♥</strong> por{' '}
              <a href="https://ranktop.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-80 transition-opacity">
                <img src="https://ik.imagekit.io/oespecialisaseo/Logo%20RANKTOP%20cropped.png" width={100} alt="Ranktop" className="inline-block align-middle" />
              </a>.
            </span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <img 
              src={logoGente} 
              alt="Gente Networking" 
              className="w-24 h-24 object-contain mx-auto mb-6 bg-white rounded-2xl p-2"
            />
            <h1 className="text-3xl font-bold mb-4">
              Instale o Gente Networking
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              Tenha acesso rápido direto da sua tela inicial
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 -mt-6">
          {/* Benefits */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Por que instalar?</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Acesso Rápido</h3>
                  <p className="text-sm text-muted-foreground">
                    Abra direto da tela inicial, sem precisar do navegador
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Funciona Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesse conteúdos salvos mesmo sem conexão com a internet
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Notificações</h3>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas sobre novas indicações e depoimentos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Experiência Nativa</h3>
                  <p className="text-sm text-muted-foreground">
                    Interface em tela cheia, como um app nativo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como instalar</CardTitle>
              <CardDescription>
                {isIOS ? 'Siga os passos abaixo no Safari' : 
                 isAndroid ? 'Siga os passos abaixo no Chrome' : 
                 'Siga os passos abaixo no seu navegador'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Direct install button for supported browsers */}
              {isInstallable && (
                <div className="mb-6">
                  <Button 
                    size="lg" 
                    className="w-full gap-2"
                    onClick={promptInstall}
                  >
                    <Download className="w-5 h-5" />
                    Instalar Agora
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Clique para adicionar à tela inicial
                  </p>
                </div>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Toque no botão Compartilhar</p>
                      <p className="text-sm text-muted-foreground">
                        Na barra inferior do Safari
                      </p>
                      <div className="mt-2 p-3 bg-muted rounded-lg inline-flex items-center gap-2">
                        <Share className="w-5 h-5" />
                        <span className="text-sm">Compartilhar</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Role para baixo e toque em</p>
                      <div className="mt-2 p-3 bg-muted rounded-lg inline-flex items-center gap-2">
                        <PlusSquare className="w-5 h-5" />
                        <span className="text-sm">Adicionar à Tela de Início</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Confirme tocando em "Adicionar"</p>
                      <p className="text-sm text-muted-foreground">
                        O ícone aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Android Instructions */}
              {isAndroid && !isInstallable && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Toque no menu do navegador</p>
                      <p className="text-sm text-muted-foreground">
                        Os três pontos no canto superior direito
                      </p>
                      <div className="mt-2 p-3 bg-muted rounded-lg inline-flex items-center gap-2">
                        <MoreVertical className="w-5 h-5" />
                        <span className="text-sm">Menu</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Toque em "Instalar app" ou "Adicionar à tela inicial"</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Confirme a instalação</p>
                      <p className="text-sm text-muted-foreground">
                        O app será adicionado à sua tela inicial
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Instructions */}
              {!isIOS && !isAndroid && !isInstallable && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Procure o ícone de instalação</p>
                      <p className="text-sm text-muted-foreground">
                        Na barra de endereço do navegador, procure por um ícone de "+" ou de instalação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Clique em "Instalar"</p>
                      <p className="text-sm text-muted-foreground">
                        O app será instalado no seu computador
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compatible Devices */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Compatível com iPhone, Android, Windows, Mac e Linux
            </p>
            <div className="flex justify-center gap-4 mt-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <Monitor className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-card py-4 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-muted-foreground">
            © 2026. Criado e operado com{' '}
            <strong className="text-destructive">♥</strong> por{' '}
            <a href="https://ranktop.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:opacity-80 transition-opacity">
              <img src="https://ik.imagekit.io/oespecialisaseo/Logo%20RANKTOP%20cropped.png" width={100} alt="Ranktop" className="inline-block align-middle" />
            </a>.
          </span>
          <span className="text-xs text-muted-foreground max-w-2xl">
            Recursos visuais licenciados por{' '}
            <a href="https://www.freepikcompany.com/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Freepik</a>,{' '}
            <a href="https://www.freepikcompany.com/legal#nav-flaticon" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Flaticon</a>,{' '}
            <a href="https://fontawesome.com/license/free" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">FontAwesome</a>{' '}
            e <a href="https://lottiefiles.com/page/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">LottieFiles</a>.
          </span>
        </div>
      </footer>
    </div>
  );
}
