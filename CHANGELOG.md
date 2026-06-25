# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/) e convenção [SemVer](https://semver.org/lang/pt-BR/).

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
