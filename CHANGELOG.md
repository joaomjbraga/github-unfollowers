# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/) e convenção [SemVer](https://semver.org/lang/pt-BR/).

---

## [1.5.1] - 2026-08-16

### Adicionado

- **Página dedicada de importação** (`import.html`) — nova página em aba separada para importar dados JSON, resolvendo o bug do Chrome no Linux que fechava o popup ao abrir o seletor de arquivos. Inclui stepper visual de 3 passos (Arquivo → Confirmar → Concluído), drag-and-drop, file picker e feedback visual com animação.

### Corrigido

- **Popup fechava ao importar (Linux)** — `input type="file"` e `showOpenFilePicker()` fechavam o popup no Linux. Solução: importação agora acontece em `import.html`, aberto via `chrome.tabs.create`.
- **z-index do modal de confirmação** — `.modal-overlay` ficava atrás do painel de import com z-index 100. Agora usa 400; toast usa 500.
- **`initI18n()` crashava no service worker** — `document.documentElement.lang` era chamado sem verificação de DOM. Adicionado guarda `typeof document !== "undefined"`.

### Removido

- **Painel de importação do popup** — `#import-panel` inteiro removido do `popup.html`, junto com ~48 linhas de funções em `app.js` (`openImportPanel`, `closeImportPanel`, `handleImportData`, `handleImportFromDropzone`) e ~40 linhas de estilos em `popup.css`.
- **Código morto em módulos** — re-exports desnecessários em `api.js` (4), `export` desnecessário em `theme.js` e `ui.js`.
- **7 chaves i18n** × 16 locales (112 linhas) — `importTitle`, `importDropZone`, `importDropZoneHint`, `importTextareaPlaceholder`, `importEmpty`, `importFileBtn`, `importFileTabHint`.

---

## [1.5.0] - 2026-07-30

### Adicionado

- **Suporte multilíngue** — sistema de internacionalização (i18n) com deteção automática do idioma do navegador e 16 idiomas disponíveis: Português, English, 中文 (Chinês), Español, हिन्दी (Hindi), العربية (Árabe), Français, Deutsch, 日本語 (Japonês), Русский (Russo), 한국어 (Coreano), Italiano, Türkçe (Turco), Tiếng Việt (Vietnamita), Polski (Polaco) e Nederlands (Holandês).
- **Seletor de idioma** — painel com lista de todos os idiomas, barra de pesquisa para filtrar por nome nativo, nome em inglês ou código, e checkmark indicando o idioma atual.
- **Persistência** — o idioma escolhido é salvo no `chrome.storage.local` e mantido entre sessões.

### Alterado

- **Localização completa da interface** — todas as strings da extensão (telas de token, listas, perfil, modais, menu, erros HTTP, etc.) agora usam o sistema de tradução.
- **Formatação localizada** — números (`toLocaleString`) e datas (`Intl.RelativeTimeFormat`) usam o locale ativo.
- **Clique em "Idioma" no menu** — agora abre um seletor visual com todos os idiomas em vez de ciclar entre PT e EN.

### Corrigido

- **`textContent` removia elementos filhos** — `data-i18n` removido de elementos pai que continham SVG ou `<span class="tab-count">`, evitando que a tradução destruísse ícones e contadores.
- **Interpolação `{count}` no header** — chave `headerFollowers` simplificada para "seguidores"/"followers" sem `{count}`, já que o número é renderizado separadamente.
- **Race condition na inicialização** — `initI18n()` e `applyI18nToDOM()` agora são chamados dentro de `init()` em `app.js`, garantindo ordem correta.

---

## [1.4.3] - 2026-07-17

### Corrigido

- **Follow/Unfollow não executavam** (regressão crítica) — `ghFetch` aceitava o parâmetro `method` (GET/PUT/DELETE) mas nunca o repassava para `fetchWithRetry`, que por sua vez não o repassava para `fetch()`. Todas as chamadas HTTP — incluindo `DELETE /user/following/{login}` (unfollow) e `PUT /user/following/{login}` (follow) — eram feitas como GET por padrão. Agora `fetchWithRetry` aceita e propaga o `method` corretamente.
- **Cancel de ação em massa não respondia imediatamente** — verificação do flag `state.cancelMassAction` só acontecia uma vez por iteração no topo do loop. Agora verifica após cada `await` (chamada API e saveProgress), interrompendo o mais rapidamente possível.

---

## [1.4.2] - 2026-07-17

### Corrigido

- **Falsos positivos de "inacessível"** — verificação GET pós-follow falhava silenciosamente por timing, marcando contas acessíveis como inacessíveis. Agora `followUser()` faz retry com delay de 1.5s antes de concluir.
- **UI não atualizava após ações** — `persistState()` não era chamado após operações que modificavam o estado, causando perda de dados ao fechar/reabrir o popup.
- **Contagem do banner não atualizava** — `addUnfollowable` não disparava `renderList()`, mantendo o contador desatualizado.
- **Event listeners duplicados** — `bindEventListeners()` era chamado múltiplas vezes, criando handlers duplicados. Agora usa guard `listenersBound`.
- **Ações em massa marcavam falhas transitórias como inacessíveis** — `runMassAction` não distinguia entre "não tentado" e "falhou". Agora retorna `{succeeded, unfollowable}` para rastreamento correto.
- **Auto-refresh durante modais** — `scheduleAutoRefresh` não verificava `state.isProcessing`, disparando refresh indesejado.
- **Banner de inacessíveis contava todos** — `activeUnfollowableCount` incluía inacessíveis de outras abas. Agora filtra apenas notFollowingBack.
- **count-all ignorava whitelist** — badge do menu mostrava total sem descontar whitelisted.
- **"Seguir todos" incluía inacessíveis** — `handleFollowAll` não filtrava contas inacessíveis antes de processar.
- **handleWhitelistToggle sem updateStats** — toggle de whitelist não atualizava contadores.
- **Badge nunca zerava** — `setBadgeText("")` não era chamado quando `totalNew === 0`, mantendo badge anterior.
- **Resume usava totalCount original** — `resumePendingMassAction` usava contador desatualizado em vez de `items.length`.
- **Toggle inacessível não atualizava badge** — alternar visibilidade de inacessíveis não recalculava contadores.
- **processMassFollowResult filtrava incorretamente** — usava `!unfollowableLogins.has()` em vez de `succeededLogins.has()`, movendo usuários errados entre categorias.
- **handleRefresh travava popup** — chamadas concorrentes de refresh causavam hang. Agora usa guard `refreshInProgress`.
- **handleLogout limpeza incompleta** — não removia todas as chaves do storage, causando dados residuais.
- **btn-unfollow-all sem filtrar whitelist** — botão "Parar de seguir todos" aparecia quando só havia whitelisted.
- **Race condition no modal** — `state.isProcessing` era definido depois do modal, criando janela para auto-refresh.
- **runMassAction nunca executava** (regressão crítica) — `state.isProcessing` permanecia `true` após modal, impedindo execução. Agora é resetado antes de chamar `runMassAction`.
- **handleUnfollowAll sem pós-processamento** — não atualizava stats/render após ação em massa.
- **removeUserItem ignorava skipSideEffects** — remoção DOM era feita mesmo em operações batch silenciosas.
- **Auto-refresh não agendava no cache** — ao carregar dados do cache, `scheduleAutoRefresh` não era chamado.
- **Silent refresh destruía cache** — erro em refresh silencioso limpava dados缓存ados. Agora só limpa em refresh visível.
- **resetState compartilhava referências** — `unfollowable` e outros Sets eram compartilhados com `INITIAL_STATE`. Agora cria novas instâncias a cada chamada.
- **Background limpava badge em erro de rede** — erros de rede não eram re-throw, causando badge "" indevidamente.
- **XSS via innerHTML** — toast de erro de unfollow usava login sem sanitização. Agora usa `escHtml()`.
- **handleRefresh sem catch** — promise rejeitada não tratada. Adicionado `.catch(() => {})`.
- **showError mantinha título antigo** — ao mostrar erro sem título, o anterior persistia.
- **VirtualScroll pool crescia indefinidamente** — pool de nós nunca encolhia. Agora limitado a 100 (`VIRTUAL_SCROLL_MAX_POOL`).
- **Retry-After causava NaN** — header HTTP-date retornava NaN, causando retry imediato. Agora usa fallback para 60s.
- **refreshInProgress não resetava no logout** — inconsistência na limpeza de estado.
- **Filtro redundante no renderList** — `unfollowTargets` já calculado era recalculado.

### Adicionado

- **skipSideEffects para operações batch** — `followUser`/`unfollowUser` aceitam `{ skipSideEffects: true }` para operações em massa, evitando efeitos colaterais indesejados.
- **Tipo de evento "not_following_back"** — novos não-seguidores agora usam tipo distinto no histórico (antes usava "followed" incorretamente).
- **ARIA em modais** — `role="dialog"`, `aria-modal` e `aria-labelledby`/`aria-label` adicionados ao modal de confirmação e painel de perfil.
- **NaN guard em Retry-After** — fallback para 60s quando header contém valor não numérico.
- **.catch() em async handlers** — 6 event listeners async agora tratam rejeições.

### Alterado

- **Toast de unfollow mais descritivo** — distingue 403/404 ("perfil inacessível"), 429 ("muitas requisições"), 5xx ("erro temporário").
- **Badge de histórico "not_following_back"** — estilo neutro (cinza) para distinguir de follow/unfollow.
- **Retry-After no background limitado a 300s** — evita bloqueio prolongado do service worker.

### Removido

- **Código morto** — `showDetectionProgress`/`hideDetectionProgress` (nunca chamados), `checkedProactive` (state nunca usado), `let done = totalCount - items.length` (sempre 0).

---

## [1.4.1] - 2026-07-16

### Corrigido

- **Mass-follow cancelado marcava usuários inocentes como inacessíveis** — ao cancelar "Seguir todos", usuários que nunca foram tentados eram incorretamente classificados como inacessíveis. Agora `runMassAction` rastreia `attemptedLogins` e apenas usuários realmente tentados são avaliados.
- **`resetState()` não resetava Sets** — `unfollowable` e `checkedProactive` eram referências compartilhadas com `INITIAL_STATE`, então `Object.assign` nunca criava novos Sets. Agora `resetState()` cria novas instâncias.
- **Badge "!" persistente no service worker** — quando um erro de servidor era detectado, o badge laranja "!" nunca era limpo mesmo que a API voltasse a funcionar. Agora o badge é limpo antes de recalcular novidades.
- **Header desatualizado após refresh** — `state.user` só era buscado na primeira carga. Agora sempre é atualizado no refresh, mantendo avatar e contador de seguidores sincronizados.
- **Async errors silenciados em abas** — `renderHistoryTab()` e `renderWhitelistTab()` eram async mas não tratavam erros. Agora erros são capturados com `.catch()`.
- **Verificação pós-follow assume sucesso silenciosamente** — erros 403/429 na verificação GET eram ignorados sem explicação. Agora há comentário claro explicando que o PUT 204 é definitive.
- **Cache vazava propriedade `ts`** — `cache.get()` retornava o objeto interno com timestamp, violando o contrato de retorno `{data, etag}`.
- **URL de avatar fallback inválida** — whitelist usava `github.com/${login}.png` (404). Agora usa `avatars.githubusercontent.com/${login}`.

### Alterado

- **`fetchWithRetry` extraído em `api.js`** — lógica de retry, rate limit e tratamento de erros foi unificada em um helper compartilhado, eliminando ~50 linhas duplicadas entre `ghFetch` e `fetchPage`.
- **`processMassFollowResult` extraída** — lógica pós-mass-follow (identificar inacessíveis + atualizar state) foi consolidada em uma função reutilizada por `handleFollowAll` e `resumePendingMassAction`.
- **`showModal` removida** — função duplicada de `showConfirmModal` foi eliminada. Os 3 callers agora usam `showConfirmModal` com o parâmetro opcional `iconColor`.
- **`sleep()` unificado** — removida duplicação entre `api.js` (local) e `utils.js` (exportado). `api.js` agora importa de `utils.js`.
- **Performance em ações em massa** — loop usa index em vez de `pending.slice(1)` por iteração, eliminando O(n²) de alocações.
- **Sets para membership tests** — `refreshUserData` agora usa `Set.has()` em vez de `Array.includes()` para testes de pertencimento, melhorando de O(n) para O(1) por operação.
- **Progresso de ação em massa simplificado** — `runMassAction` retorna `attemptedLogins` além de `succeededLogins`, permitindo distinção correta entre "não tentado" e "falhou".

### Removido

- **`detectUnfollowableProactive`** — detecção proativa de perfis privados via `GET /users/{login}` removida. A condição `user_view_type === "private"` nunca coincidia (campo não existe na API pública do GitHub), resultando em chamadas API desperdiçadas e consumo de rate limit sem benefício. A detecção de privados já funciona via verificação GET em `followUser()`.
- **`loadCheckedProactive`** — função de carregar estado de verificação proativa removida junto com a detecção.
- **`showModal`** — função duplicada de modal de confirmação removida.
- **`sleep()` local em `api.js`** — duplicata da função exportada em `utils.js`.

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
