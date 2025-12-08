# Documentação PWA - Gente Networking

Esta documentação descreve a implementação completa do Progressive Web App (PWA) para o sistema Gente Networking.

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração Atual](#configuração-atual)
4. [Publicação nas Lojas](#publicação-nas-lojas)
5. [Push Notifications](#push-notifications)
6. [Modo Offline](#modo-offline)
7. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O Gente Networking é um PWA completo que oferece:

- ✅ Instalação em dispositivos móveis e desktop
- ✅ Funcionamento offline com cache inteligente
- ✅ Notificações push (preparado para implementação completa)
- ✅ Experiência nativa (sem barra de navegador)
- ✅ Atualizações automáticas do service worker
- ✅ Pronto para publicação no Google Play e App Store

### Tecnologias Utilizadas

- **vite-plugin-pwa**: Geração automática do service worker e manifest
- **Workbox**: Estratégias de cache e offline
- **Web Push API**: Notificações push (preparado)

---

## Arquitetura

### Estrutura de Arquivos

```
public/
├── icons/                         # Ícones PWA
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── icon-maskable-192x192.png  # Para Android Adaptive Icons
│   └── icon-maskable-512x512.png
├── screenshots/                    # Screenshots para lojas
│   ├── screenshot-mobile.png
│   └── screenshot-desktop.png
└── splash/                         # Splash screens iOS
    ├── apple-splash-640-1136.png
    ├── apple-splash-750-1334.png
    ├── apple-splash-828-1792.png
    ├── apple-splash-1125-2436.png
    ├── apple-splash-1170-2532.png
    ├── apple-splash-1242-2208.png
    ├── apple-splash-1242-2688.png
    ├── apple-splash-1284-2778.png
    ├── apple-splash-1536-2048.png
    ├── apple-splash-1668-2388.png
    └── apple-splash-2048-2732.png

src/
├── components/
│   ├── PWAInstallPrompt.tsx       # Banner de instalação
│   ├── OfflineIndicator.tsx       # Indicador de conexão
│   └── NotificationSettings.tsx   # Configurações de push
├── hooks/
│   ├── usePWAInstall.ts           # Hook de instalação
│   ├── usePushNotifications.ts    # Hook de notificações
│   └── useOfflineData.ts          # Hook de dados offline
└── pages/
    └── Instalar.tsx               # Página de instalação

docs/
└── PWA_IMPLEMENTATION.md          # Esta documentação
```

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `PWAInstallPrompt` | Banner discreto que aparece após 3s para sugerir instalação |
| `OfflineIndicator` | Barra no topo indicando status de conexão |
| `NotificationSettings` | Card para configurar notificações push |
| `Instalar.tsx` | Página dedicada com instruções de instalação |

---

## Configuração Atual

### vite.config.ts

O plugin `vite-plugin-pwa` está configurado em `vite.config.ts`:

```typescript
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "icons/*.png", "splash/*.png"],
  manifest: {
    name: "Gente Networking - Comunidade de Negócios",
    short_name: "Gente",
    theme_color: "#1e3a5f",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    // ... icons, screenshots, shortcuts
  },
  workbox: {
    runtimeCaching: [
      // Supabase API: NetworkFirst
      // Fonts: CacheFirst
      // Images: CacheFirst
    ]
  }
})
```

### index.html

Meta tags PWA incluídas:

```html
<!-- PWA Meta Tags -->
<meta name="theme-color" content="#1e3a5f" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Gente Networking" />

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

<!-- Apple Splash Screens -->
<link rel="apple-touch-startup-image" href="/splash/..." media="..." />
```

---

## Publicação nas Lojas

### Google Play Store (via TWA)

A forma mais simples de publicar um PWA no Google Play é usando **Trusted Web Activity (TWA)**.

#### Pré-requisitos

1. Conta de desenvolvedor Google Play ($25 taxa única)
2. Node.js instalado
3. Android SDK configurado (ou Android Studio)

#### Passo a Passo com Bubblewrap

```bash
# 1. Instalar Bubblewrap globalmente
npm install -g @anthropic/anthropic

# 2. Inicializar o projeto
bubblewrap init --manifest https://comunidade.gentenetworking.com.br/manifest.webmanifest

# Durante a inicialização, configure:
# - Package ID: br.com.gentenetworking.comunidade
# - App name: Gente Networking
# - Start URL: /
# - Theme color: #1e3a5f

# 3. Gerar o APK
bubblewrap build

# 4. O arquivo será gerado em:
# ./app-release-signed.apk
```

#### Passo a Passo com PWABuilder

1. Acesse https://www.pwabuilder.com/
2. Insira a URL: `https://comunidade.gentenetworking.com.br`
3. Clique em "Start"
4. Aguarde a análise do PWA
5. Na seção "Package for stores", clique em "Android"
6. Configure as opções:
   - **Package ID**: `br.com.gentenetworking.comunidade`
   - **App Name**: `Gente Networking`
   - **App Version**: `1.0.0`
   - **Theme Color**: `#1e3a5f`
7. Clique em "Generate"
8. Baixe o arquivo ZIP com o APK

#### Publicação no Google Play Console

1. Acesse https://play.google.com/console
2. Crie um novo app
3. Preencha a ficha da loja:
   - Nome: Gente Networking
   - Descrição curta: Sistema de gestão da comunidade Gente Networking
   - Descrição completa: (ver texto abaixo)
   - Screenshots: Use os de `/public/screenshots/`
   - Ícone: Use `/public/icons/icon-512x512.png`
4. Upload do APK em "Versões" > "Produção"
5. Configure classificação indicativa (geralmente "Livre")
6. Configure preço (Gratuito)
7. Envie para revisão

**Descrição para a loja:**

```
Gente Networking - Conectando pessoas, gerando negócios.

O aplicativo oficial da comunidade Gente Networking permite que você:

📊 Acompanhe suas estatísticas de networking
👥 Registre reuniões 1-a-1 (Gente em Ação)
💬 Envie e receba depoimentos
📞 Gerencie indicações de contatos
🏆 Acompanhe seu ranking e pontuação
📅 Visualize encontros da comunidade
📚 Acesse conteúdos exclusivos

Funciona offline e oferece experiência nativa no seu dispositivo!
```

#### Arquivo assetlinks.json

Para verificação do TWA, crie o arquivo em seu servidor:

```
https://comunidade.gentenetworking.com.br/.well-known/assetlinks.json
```

Conteúdo:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "br.com.gentenetworking.comunidade",
    "sha256_cert_fingerprints": [
      "SEU_SHA256_FINGERPRINT_AQUI"
    ]
  }
}]
```

Para obter o SHA256:

```bash
keytool -list -v -keystore sua-keystore.jks -alias seu-alias
```

---

### Apple App Store (via PWABuilder)

#### Pré-requisitos

1. Conta Apple Developer ($99/ano)
2. Mac com Xcode instalado
3. Certificados de distribuição configurados

#### Passo a Passo

1. Acesse https://www.pwabuilder.com/
2. Insira a URL: `https://comunidade.gentenetworking.com.br`
3. Clique em "Start"
4. Na seção "Package for stores", clique em "iOS"
5. Configure as opções:
   - **Bundle ID**: `br.com.gentenetworking.comunidade`
   - **App Name**: `Gente Networking`
   - **Version**: `1.0.0`
6. Clique em "Generate"
7. Baixe o projeto Xcode

#### No Xcode

1. Abra o projeto `.xcodeproj` baixado
2. Configure o Team (sua conta de desenvolvedor)
3. Configure o Bundle ID
4. Verifique as capacidades (Push Notifications se desejar)
5. Archive: Product > Archive
6. Envie para a App Store Connect

#### Na App Store Connect

1. Acesse https://appstoreconnect.apple.com
2. Crie um novo app
3. Preencha a ficha:
   - Nome: Gente Networking
   - Subtítulo: Comunidade de Negócios
   - Palavras-chave: networking, negócios, comunidade, indicações
   - Screenshots: Use os de `/public/screenshots/`
   - Descrição: (mesma do Google Play)
4. Upload do build via Xcode
5. Envie para revisão

---

## Push Notifications

### Estado Atual

O sistema está **preparado** para push notifications, mas requer configuração adicional do servidor.

### Implementação Completa (Futura)

#### 1. Gerar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Guarde as chaves geradas:
- **Public Key**: Para usar no frontend
- **Private Key**: Para usar no backend (Edge Function)

#### 2. Configurar Secrets no Supabase

```bash
# Via CLI ou dashboard
VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_SUBJECT=mailto:contato@gentenetworking.com.br
```

#### 3. Atualizar Hook de Push

```typescript
// Em usePushNotifications.ts
const VAPID_PUBLIC_KEY = 'sua_chave_publica';

const subscribe = async () => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Enviar subscription para o backend
  await supabase.functions.invoke('save-push-subscription', {
    body: { subscription: subscription.toJSON() }
  });
};
```

#### 4. Criar Edge Function para Enviar Push

```typescript
// supabase/functions/send-push/index.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT'),
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

// Buscar subscriptions do usuário e enviar notificação
```

#### 5. Criar Tabela de Subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Modo Offline

### Estratégias de Cache

| Tipo de Recurso | Estratégia | Tempo de Cache |
|-----------------|------------|----------------|
| API Supabase | NetworkFirst | 24 horas |
| Google Fonts | CacheFirst | 1 ano |
| Imagens | CacheFirst | 30 dias |
| Assets estáticos | CacheFirst | Indefinido |

### Hook useOfflineData

```typescript
// Exemplo de uso
const { data, isOffline, isStale, refresh } = useOfflineData({
  key: 'my-data',
  fetchFn: async () => await supabase.from('table').select('*'),
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

### Funções Auxiliares

```typescript
// Limpar todos os dados offline
import { clearOfflineData } from '@/hooks/useOfflineData';
clearOfflineData();

// Ver tamanho dos dados armazenados
import { getOfflineDataSize } from '@/hooks/useOfflineData';
console.log(getOfflineDataSize()); // "1.23 MB"
```

---

## Troubleshooting

### O PWA não está instalável

1. Verifique se está usando HTTPS
2. Verifique se o manifest.webmanifest está acessível
3. Verifique se o service worker está registrado
4. Use Chrome DevTools > Application > Manifest

### Service Worker não atualiza

1. Limpe o cache do navegador
2. Use "Update on reload" no DevTools
3. Verifique se `registerType: "autoUpdate"` está configurado

### Push notifications não funcionam

1. Verifique permissões do navegador
2. Verifique se VAPID keys estão configuradas
3. Verifique logs no console

### Splash screen não aparece no iOS

1. Verifique se todas as imagens de splash existem
2. Verifique se os media queries estão corretos no index.html
3. Teste em dispositivo físico (simulador pode ter bugs)

---

## Checklist de Produção

- [ ] Testar instalação em Android
- [ ] Testar instalação em iOS
- [ ] Testar instalação em Desktop
- [ ] Verificar funcionamento offline
- [ ] Configurar VAPID keys para push (opcional)
- [ ] Criar assetlinks.json para TWA
- [ ] Gerar APK com Bubblewrap ou PWABuilder
- [ ] Publicar no Google Play
- [ ] Gerar projeto iOS com PWABuilder
- [ ] Publicar na App Store

---

## Referências

- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [PWABuilder](https://www.pwabuilder.com/)
- [Bubblewrap](https://github.com/nicolo-nicolo/nicolo)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [TWA Documentation](https://developer.chrome.com/docs/android/trusted-web-activity/)

---

*Última atualização: Dezembro 2025*
