# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/) e convenção [SemVer](https://semver.org/lang/pt-BR/).

---

## [1.4.0] - 2026-07-13

### Adicionado

- **Detecção de perfis privados / restrições** — contas que não podem ser seguidas automaticamente (perfil privado, bloqueado, spam) são identificadas e classificadas como "inacessíveis".
- **Banner de aviso na aba "Não sigo"** — exibe a quantidade de contas não acionáveis com botão "Mostrar/Ocultar" para alternar a visibilidade.
- **Badge "Inacessível"** — substitui o botão "Seguir" em contas que não podem ser seguidas, evitando cliques inúteis.
- **Persistência** — contas inacessíveis são salvas no `chrome.storage.local` e sobrevivem a refresh/fechamento do popup.
- **Contador dinâmico** — badge da aba "Não sigo" subtrai contas inacessíveis quando ocultas, refletindo o número real de ações disponíveis.
- **Verificação pós-follow** — após "Seguir todos", verifica quais users foram adicionados a `state.following` para identificar os inacessíveis (perfis privados retornam 204 mas ficam pendentes).
- **Detecção proativa de perfis privados** — na abertura do popup, verifica users em `notFollowingBack` via `GET /users/{login}` em batches silenciosos. Perfis com `user_view_type === "private"` são marcados como inacessíveis automaticamente. Progresso salvo no storage para retomada.
- **Histórico de eventos** — eventos de "inacessível" agora são registrados no histórico junto com follow/unfollow.

### Corrigido

- **"Seguir todos" marcava todos como inacessíveis** — `runMassAction` agora retorna o conjunto de logins que tiveram sucesso, e `handleFollowAll`/`resumePendingMassAction` usam esse retorno em vez de verificar `state.following` (que nunca era atualizado pela ação em massa).
- **`list.sort()` corrompia arrays do state** — `getFilteredList` agora sempre retorna uma cópia do array, evitando que `.sort()` modifique os dados canônicos.
- **Falhas de storage silenciosas** — `storage.js` agora verifica `chrome.runtime.lastError` em todas as operações e rejeita a promise em caso de erro.
- **Loop infinito no service worker** — `background.js` `fetchAllPages` agora tem limite de 3 retries em HTTP 429, evitando que o service worker travasse.
- **Badge persistente com token expirado** — badge da extensão é limpo quando o token é inválido.
- **Poluição de classe do modal** — `showModal` agora define `modalConfirm.className` explicitamente, evitando que `showConfirmModal` afete modais subsequentes.
- **`modalCount` com dados antigos** — `showConfirmModal` agora limpa o elemento `modalCount`.
- **Race condition no refresh** — `refreshUserData` agora tem guard de re-entrância (`refreshInProgress`) para evitar chamadas concorrentes.
- **Race condition no botão whitelist** — `onWhitelistToggle` é conectado imediatamente em `openProfilePanel`, eliminando a janela entre abertura do painel e bind assíncrono do handler.
- **`per_page` hardcoded no cache** — `cache.js` agora usa `PAGE_SIZE` de `constants.js` em vez de valor fixo `100`.

### Removido

- **Código morto em JS** — `sleep` import/re-export desnecessário em `ui.js`, `profilePanelCloseCallback` (write-only), `refreshEmptyState`/`refreshUnfollowAllBtn` (exportados mas nunca chamados), `isWhitelisted` (desestruturado mas não usado), `onWhitelistToggle` (passado mas ignorado), `fetchAllPages` (exportado mas só usado internamente), `onProgress` (parâmetro nunca utilizado), 3 exports legado em `constants.js`, `clearWhitelist` (nunca importado), `createLoginSet` (exportado mas só usado internamente).
- **Código morto em CSS** — `.btn-ghost-danger`, `.skeleton-header`, `.skeleton-avatar`, `.skeleton-line-sm`, `.skeleton-btn-group`, `.skeleton-btn`, 5 variáveis CSS não utilizadas (`--bg-inset`, `--bg-overlay`, `--border`, `--border-muted`, `--shadow`), regra `#results-state.hidden` redundante.

---

## [1.3.1] - 2026-06-28

### Adicionado

- **Export/Import de dados** — whitelist e histórico agora podem ser exportados e importados como arquivo JSON pelo menu (`⋯`).
- **Menu dropdown** — botões de tema, recarregar e desconectar foram movidos para um menu suspenso estilo iOS, acessível pelo ícone `⋯` no header, liberando espaço visual.

### Alterado

- **Texto do passo 1 do token** — agora explica que os escopos `read:user` + `user:follow` já vêm pré-selecionados na página de criação do token.
- **Atalho de teclado T** — alternar tema agora funciona independentemente do botão `btn-theme` (que foi removido).

### Corrigido

- **Crash na aba whitelist** — seletor `$(".nav-bar")` alterado para `$("nav-bar")` (usava classe em vez de ID), que causava erro ao abrir a aba whitelist.

---

## [1.3.0] - 2026-06-27

### Adicionado

- **Retomada de ações em massa** — o progresso de "Seguir todos" / "Parar de seguir todos" agora é salvo em `chrome.storage.local` a cada item processado. Se o popup fechar (acidentalmente ou não) no meio do processo, reabrir a extensão retoma a fila pendente automaticamente a partir de onde parou, em vez de perder a contagem.
- **Contador de seguidores no header** — exibe o número de seguidores do perfil ao lado do login, com formatação localizada (pt-BR).
- **Comparativo histórico** — novos não-seguidores desde a última verificação são marcados com um badge "Novo" na lista.
- **Follow back em massa** — botão "Seguir todos" na aba "Não sigo" para seguir de volta todos de uma vez, com modal de confirmação e rate-limit awareness.
- **Badge "Novo"** — indicador visual para não-seguidores detectados pela primeira vez.

### Alterado

- **Redesign visual estilo iOS** — nova paleta baseada no dark mode do iOS (preto verdadeiro, cards elevados em camadas, cores de sistema `systemGreen`/`systemRed`/`systemBlue`). Abas migraram para um segmented control. A lista de usuários agora vive dentro de um card "inset grouped" com separadores internos finos em vez de bordas retas. O modal de confirmação foi substituído por um action sheet que sobe de baixo, com o botão destrutivo cheio no topo e "Cancelar" como segundo botão — no padrão nativo do iOS.
- **Header com blur** — a barra superior agora usa `backdrop-filter` translúcido em vez de fundo opaco sólido.
- **TOKEN SCREEN centralizada** — tela de login redimensionada e centralizada verticalmente, hero/título removidos
- **Campo de token otimizado** — input com mesmo tamanho do botão, enter no campo conecta automaticamente
- **Botão toggle removido** — simplificação do fluxo de login ao remover UI não essencial
- **Header compacto de linha única** — unificou perfil, contador e ações em uma única linha (~40px), liberando ~38px verticais para a lista de usuários.
- **Performance na lista** — follow/unfollow agora usam manipulação direta do DOM (DOM surgery) ao invés de reconstruir a lista inteira, tornando a ação instantânea.
- **Debounce na busca** — input de pesquisa agora aguarda 200ms de pausa antes de renderizar, evitando re-renders desnecessários durante a digitação.
- **Ordenação da lista** — seletor no toolbar permite ordenar por mais/menos seguidores e A-Z.
- **Fluxo de login simplificado** — guia visual de 3 passos com botão "Criar token no GitHub" que abre a página de token com escopos pré-selecionados.

### Corrigido

- **Card de lista vazando em estados vazios** — quando "Tudo certo!" ou "Nenhum resultado" aparecem, o card da lista de usuários (agora com fundo sólido) não fica mais visível por baixo da mensagem.
- **Botão "Parar" no erro de unfollow** — o botão individual voltava com texto "Parar" em vez de "Deixar de seguir" ao ocorrer erro na API.
- **done counter impreciso em ações em massa** — o contador de progresso só incrementa agora em caso de sucesso, não mais em falhas.
- **Focus trap no modal de confirmação** — Tab/Shift+Tab agora cicla apenas entre os botões do modal, sem escapar para trás da overlay.

### Acessibilidade

- **ARIA nas abas** — `role="tablist"`, `role="tab"`, `aria-selected` e `tabindex` adicionados nas nav-tabs e sub-tabs, com navegação por setas (ArrowLeft/ArrowRight).
- **Avatar com suporte a teclado** — `tabindex="0"`, `role="button"` e evento Enter/Space para abrir painel de perfil.
- **Progresso com ARIA** — `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` e `aria-live="polite"` no label de carregamento.
- **Focus trap no modal** — foco preso dentro do modal enquanto aberto.

### Alterado

- **Confirmação ao retomar ação em massa** — se o popup fechar no meio de uma ação em massa, ao reabrir um modal pergunta se deseja retomar, em vez de disparar automaticamente.
- **Badge no ícone da extensão** — quando o background detecta novos não-seguidores, o ícone na toolbar exibe um badge laranja com o total de novidades. O badge é limpo ao abrir o popup.
- **tsconfig.json adicionado** — TypeScript `checkJs: true` para verificação de tipos nos arquivos `.js` sem necessidade de migração.

---

## [1.2.1] - 2026-06-25

### Alterado

- **Separação de responsabilidades** — `src/ui.js` agora é responsável apenas pela renderização da interface, enquanto `src/app.js` gerencia a lógica de follow/unfollow.
- **Melhoria de estabilidade** — ações de seguir/deixar de seguir atualizam corretamente o estado e a renderização nos diferentes estados da UI.
- **Renderização mais limpa** — injeção de handlers externos na lista de usuários reduz o acoplamento entre apresentação e lógica.

### Corrigido

- **Consistência de ação** — botões de seguir e deixar de seguir respondem corretamente após pesquisa e troca de abas.
- **Separação de camada** — removida lógica de API de `src/ui.js`, tornando a interface apenas um layer de visualização.

---

## [1.2.0] - 2026-06-24

### Adicionado

- **Aba "Não sigo"** — lista pessoas que te seguem mas você não segue de volta, com botão "Seguir" para follow back com um clique
- **Modal de confirmação customizado** para ação "Parar de seguir todos", substituindo o `confirm()` nativo
- **Perfil do usuário no header** — avatar, @login e nome completo exibidos abaixo do título
- **Ícone customizado no header** — usa `icons/icon48.png` ao invés de SVG inline

### Alterado

- **Refaturação completa do CSS** — extraído de `popup.html` inline para `popup.css` separado
- **Refaturação completa do JavaScript** — código modularizado em `src/` com ES Modules:
  - `store.js` — estado global
  - `api.js` — requisições GitHub e storage
  - `ui.js` — renderização, stats e ações
  - `dom.js` — helpers de DOM
  - `main.js` — eventos, tabs e bootstrap
- **Popups responsivos** — largura adaptável (`320px` a `600px`), altura fixa de `500px`
- **Reset de tab no refresh** — ao atualizar dados, volta automaticamente para a aba "Não Seguidores"
- **Dados reais no follow back** — ao seguir alguém pela aba "Não sigo", o objeto completo (com nome e avatar) é adicionado ao estado

### Corrigido

- **Bug de IDs duplicados** — elementos duplicados no HTML causavam conflito nos event listeners
- **Stats bar zombie** — estrutura HTML sem abertura que causava exibição corrompida
- **Contagem da aba "Não sigo" não atualizava** — `id` faltando no elemento do contador
- **Logout não limpa `notFollowingBack`** — causava exibição de dados antigos após novo login
- **Mensagens de estado vazio** — mensagens adaptadas por aba ("Nenhum seguidor mútuo", "Todos que te seguem, você já segue de volta")
- **Botão "Parar de seguir todos"** — oculto quando não há usuários para deixar de seguir
- **Lógica de unfollow** — ao deixar de seguir alguém que ainda te segue, corretamente adiciona à aba "Não sigo"

---

## [1.1.0] - Data anterior

### Adicionado

- Aba "Não sigo" (follow back)
- Modal de confirmação customizado para unfollow em massa
- Header com perfil do usuário
- Estilos responsivos

### Corrigido

- Bugs de interface duplicada
- Estado vazio exibindo mensagem incorreta
- Logout não resetando todas as listas
