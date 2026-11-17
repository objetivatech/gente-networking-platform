<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# v3.64.7 — Persistência do aviso de perfil

- Modal reaparece em cada abertura de página enquanto faltarem campos, inclusive ao retornar, navegar para a mesma URL ou recarregar.
- Fechar ou Lembrar mais tarde não memoriza dispensa por página/sessão; apenas libera o instante atual para o guia ou navegação.
- Perfil completo deixa de receber o aviso; remover qualquer um dos 12 campos obrigatórios reativa a pendência. Pitch por IA continua opcional.
- Edição do perfil permanece livre do aviso automático; vídeo, menu e outros diálogos continuam sem sobreposição com perfil/guia.
- Testes de regressão cobrem os cinco papéis, navegação, retorno, mesma URL, recarga, dispensas antigas, edição, completude dinâmica e prioridade do vídeo.
- Validação: 228 testes aprovados e build OK; histórico 3.64.7 registrado sem novos alertas de segurança (79 preexistentes).
- Aceite pela interface autenticada e publicação Cloudflare continuam pendentes no Supabase externo; nenhuma conta, presença, assinatura ou ponto foi alterado.