import { getStorage, setStorage } from "./storage.js";

const LOCALE_KEY = "locale_v1";
export const SUPPORTED_LOCALES = [
  "pt", "en", "zh", "es", "hi", "ar", "fr", "de", "ja", "ru", "ko", "it", "tr", "vi", "pl", "nl",
];
const DEFAULT = "pt";
const LOCALE_MAP = {
  pt: "pt-BR", en: "en", zh: "zh-CN", es: "es", hi: "hi", ar: "ar",
  fr: "fr", de: "de", ja: "ja", ru: "ru", ko: "ko",
  it: "it", tr: "tr", vi: "vi", pl: "pl", nl: "nl",
};

/**
 * @type {{ [locale: string]: { [key: string]: string } }}
 */
const TRANSLATIONS = {
  pt: {
    // -- Token screen --
    tokenStep1Title: "Crie seu token",
    tokenStep1Desc:
      'Os escopos <code>read:user</code> + <code>user:follow</code> já vêm pré-selecionados. Role até o final da página e clique em <strong>Generate token</strong>.',
    btnCreateToken: "Abrir página de tokens no GitHub",
    tokenStep2Title: "Copie o token",
    tokenStep2Desc: "Começa com <code>ghp_</code>",
    tokenStep3Title: "Cole e conecte",
    tokenStep3Desc: 'No campo abaixo, clique em "Conectar"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Conectar",
    reportProblem: "Reportar problema",

    // -- Header --
    headerFollowers: "seguidores",

    // -- Nav tabs --
    navResults: "Listas",
    navHistory: "Histórico",
    navWhitelist: "Whitelist",

    // -- Result tabs --
    tabAll: "Não Seguidores",
    tabNotFollowingBack: "Não sigo",
    tabMutual: "Mútuos",

    // -- Search --
    searchPlaceholder: "Filtrar por username... (/)",

    // -- List header / labels --
    listLabelUnfollowers: "Não te seguem de volta",
    listLabelMutual: "Seguidores mútuos",
    listLabelNotFollowingBack: "Quem segue você",

    // -- Buttons --
    btnCancel: "Cancelar",
    btnFollowAll: "Seguir todos",
    btnUnfollowAll: "Parar de seguir todos",
    btnShow: "Mostrar",
    btnHide: "Ocultar",

    // -- Empty / success states --
    emptyFiltered: "Nenhum resultado para este filtro.",
    allFollowingBackTitle: "<strong>Tudo certo!</strong>",
    allFollowingBackAll: "<strong>Tudo certo!</strong> Todos que você segue te seguem de volta.",
    allFollowingBackMutual: "<strong>Nenhum seguidor mútuo.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Todos que te seguem, você já segue de volta.</strong>",

    // -- Unfollowable banner --
    unfollowableBanner: "{count} contas não podem ser seguidas automaticamente.",

    // -- History --
    historyTitle: "Histórico",
    historyHint: "30 dias",
    btnClearHistory: "Limpar",
    historyEmpty: "Nenhum evento registrado ainda.",
    historyTimeNow: "agora mesmo",

    // -- Whitelist --
    whitelistTitle: "Whitelist",
    whitelistHint: "Ignorados",
    whitelistEmpty: "Nenhum usuário na whitelist.",

    // -- Profile panel --
    profileFollowers: "seguidores",
    profileFollowing: "seguindo",
    profileRepos: "repos",
    profilePopularRepos: "Repositórios populares",
    profileNoRepos: "Nenhum repositório público.",
    profileLoading: "Carregando...",
    profileClose: "Fechar (Esc)",
    profileWhitelistAdd: "Ignorar sempre",
    profileWhitelistRemove: "Remover da whitelist",

    // -- Modal --
    modalCancel: "Cancelar",
    modalTitleUnfollow: "Deixar de seguir?",
    modalTitleFollow: "Seguir de volta?",
    modalTitleImport: "Importar dados?",
    modalTextUnfollow:
      "Você está prestes a deixar de seguir <strong>{count}</strong> usuário(s) que não te seguem de volta.",
    modalTextFollow: "Você está prestes a seguir <strong>{count}</strong> usuário(s) que te seguem.",
    modalTextResumeFollow: "Você está prestes a seguir <strong>{count}</strong> usuário(s) que te seguem.",
    modalTextResumeUnfollow:
      "Você está prestes a deixar de seguir <strong>{count}</strong> usuário(s) que não te seguem de volta.",
    modalTextImport:
      "Importar <strong>{whitelistCount}</strong> utilizador(es) na whitelist e <strong>{historyCount}</strong> evento(s) de histórico.<br><br>Os dados atuais serão substituídos.",
    modalConfirmUnfollow: "Sim, deixar de seguir",
    modalConfirmFollow: "Sim, seguir",
    modalConfirmImport: "Sim, importar",

    // -- Menu --
    menuTheme: "Alternar tema",
    menuRefresh: "Recarregar dados",
    menuExport: "Exportar dados",
    menuImport: "Importar dados",
    menuDev: "Simular erros",
    menuReport: "Reportar problema",
    menuLogout: "Desconectar",
    menuLanguage: "Idioma: {lang}",
    langPickerTitle: "Seleccionar idioma",
    langPickerSearchPlaceholder: "Buscar idioma...",

    shortcutsHint:
      "1·2·3 abas  |  / busca  |  H hist.  |  W wlist  |  T tema  |  Esc fecha",

    // -- Dev panel --
    devTitle: "Simulação de Erros",
    devDescription: "Selecione um cenário para simular comportamento da API.",
    devClear: "Limpar simulação",
    devHint: "As configurações persistem no armazenamento local.",
    devClose: "Fechar",

    // -- Badges --
    badgeInaccessible: "Inacessível",
    badgeMutual: "Mútuo",
    badgeNew: "Novo",
    badgeWhitelist: "Ignorado",
    badgeFollowed: "Seguiu você",
    badgeNotFollowingBack: "Não segue você",
    badgeUnfollowed: "Deixou de seguir",

    // -- Action buttons on user items --
    actionFollow: "Seguir",
    actionUnfollow: "Parar",
    actionRemove: "Remover",
    actionViewProfile: "Ver perfil",
    actionWhitelistAdd: "Ignorar sempre",
    actionWhitelistRemove: "Remover da whitelist",

    // -- Loading messages --
    loadingProfile: "Obtendo seu perfil...",
    loadingFollowing: "Carregando lista de seguindo...",
    loadingFollowers: "Carregando lista de seguidores...",
    loadingCalculating: "Calculando...",

    // -- Processing --
    processingLabel: "Processando",
    resumingLabel: "Retomando",
    cancelledLabel: "Cancelado ({done}/{total})",
    cancellingLabel: "Cancelando...",

    // -- Connect flow --
    connectChecking: "Verificando...",
    connectErrorNoToken: "Cole seu Personal Access Token acima.",
    connectErrorExpired: "Token inválido ou expirado. Gere um novo token.",
    connectErrorSession:
      "Sessão expirada. Seu token foi removido. Faça login novamente.",
    connectErrorTokenExpired:
      "Token salvo expirou ou foi revogado. Gere um novo.",

    // -- Generic error --
    errorTitle: "Algo deu errado",
    errorRetry: "Tentar novamente",

    // -- Follow / Unfollow errors --
    errorUnfollowInaccessible:
      "Não foi possível deixar de seguir {login}: perfil inacessível.",
    errorRateLimit:
      "Muitas requisições. Aguarde e tente novamente.",
    errorGitHubTemp: "Erro temporário do GitHub. Tente novamente.",
    errorUnfollow: "Erro ao deixar de seguir {login}: {message}",
    errorFollow: "Erro ao seguir {login}: {message}",

    // -- Import errors --
    importErrorFormat: "Formato de ficheiro inválido.",
    importErrorGeneric: "Erro ao importar: {message}",

    // -- HTTP error messages (utils) --
    http400: "Algo foi enviado de forma incorreta. Por favor, tente novamente.",
    http401: "Sua sessão expirou. Por favor, faça login novamente.",
    http403:
      "O GitHub bloqueou esta requisição. Você pode ter atingido o limite de uso ou não tem permissão para este recurso.",
    http404: "Não foi possível encontrar este recurso no GitHub.",
    http422:
      "O GitHub recusou esta operação. Verifique se o perfil é público ou se há alguma restrição.",
    http429:
      "Você fez muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.",
    http500:
      "Algo deu errado nos servidores do GitHub. Isso é temporário — tente novamente em alguns instantes.<br>{statusLink}",
    http502:
      "O GitHub está temporariamente fora do ar. Tente novamente em alguns instantes.<br>{statusLink}",
    http503:
      "O GitHub está temporariamente indisponível, possivelmente em manutenção. Tente novamente em alguns minutos.<br>{statusLink}",
    http504:
      "A conexão com o GitHub demorou demais e foi interrompida. Verifique sua internet e tente novamente.<br>{statusLink}",
    httpUnknown:
      "Ocorreu um erro inesperado no GitHub (HTTP {status}). Tente novamente.",
    httpStatusLink: "Acompanhe o status do GitHub",

    // -- Background worker --
    bgNetworkError: "Falha de rede",

    // -- API errors --
    apiTimeout: "A requisição excedeu o tempo limite. Verifique sua conexão.",
    apiNetworkError: "Sem conexão com a internet. Verifique sua rede.",
  },

  en: {
    tokenStep1Title: "Create your token",
    tokenStep1Desc:
      'Scopes <code>read:user</code> + <code>user:follow</code> are pre-selected. Scroll to the bottom of the page and click <strong>Generate token</strong>.',
    btnCreateToken: "Open GitHub token page",
    tokenStep2Title: "Copy the token",
    tokenStep2Desc: "Starts with <code>ghp_</code>",
    tokenStep3Title: "Paste & connect",
    tokenStep3Desc: 'In the field below, click "Connect"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Connect",
    reportProblem: "Report issue",

    headerFollowers: "followers",

    navResults: "Lists",
    navHistory: "History",
    navWhitelist: "Whitelist",

    tabAll: "Non-followers",
    tabNotFollowingBack: "Don't follow",
    tabMutual: "Mutuals",

    searchPlaceholder: "Filter by username... (/)",

    listLabelUnfollowers: "Not following you back",
    listLabelMutual: "Mutual followers",
    listLabelNotFollowingBack: "Who follows you",

    btnCancel: "Cancel",
    btnFollowAll: "Follow all",
    btnUnfollowAll: "Unfollow all",
    btnShow: "Show",
    btnHide: "Hide",

    emptyFiltered: "No results for this filter.",
    allFollowingBackTitle: "<strong>All clear!</strong>",
    allFollowingBackAll:
      "<strong>All clear!</strong> Everyone you follow follows you back.",
    allFollowingBackMutual: "<strong>No mutual followers.</strong>",
    allFollowingBackNotFollowingBack:
      "<strong>You follow back everyone who follows you.</strong>",

    unfollowableBanner:
      "{count} accounts cannot be followed automatically.",

    historyTitle: "History",
    historyHint: "30 days",
    btnClearHistory: "Clear",
    historyEmpty: "No events recorded yet.",
    historyTimeNow: "just now",

    whitelistTitle: "Whitelist",
    whitelistHint: "Ignored",
    whitelistEmpty: "No users in whitelist.",

    profileFollowers: "followers",
    profileFollowing: "following",
    profileRepos: "repos",
    profilePopularRepos: "Popular repositories",
    profileNoRepos: "No public repositories.",
    profileLoading: "Loading...",
    profileClose: "Close (Esc)",
    profileWhitelistAdd: "Always ignore",
    profileWhitelistRemove: "Remove from whitelist",

    modalCancel: "Cancel",
    modalTitleUnfollow: "Unfollow?",
    modalTitleFollow: "Follow back?",
    modalTitleImport: "Import data?",
    modalTextUnfollow:
      "You are about to unfollow <strong>{count}</strong> user(s) who don't follow you back.",
    modalTextFollow:
      "You are about to follow <strong>{count}</strong> user(s) who follow you.",
    modalTextResumeFollow:
      "You are about to follow <strong>{count}</strong> user(s) who follow you.",
    modalTextResumeUnfollow:
      "You are about to unfollow <strong>{count}</strong> user(s) who don't follow you back.",
    modalTextImport:
      "Import <strong>{whitelistCount}</strong> user(s) in whitelist and <strong>{historyCount}</strong> history event(s).<br><br>Current data will be replaced.",
    modalConfirmUnfollow: "Yes, unfollow",
    modalConfirmFollow: "Yes, follow",
    modalConfirmImport: "Yes, import",

    menuTheme: "Toggle theme",
    menuRefresh: "Refresh data",
    menuExport: "Export data",
    menuImport: "Import data",
    menuDev: "Simulate errors",
    menuReport: "Report issue",
    menuLogout: "Disconnect",
    menuLanguage: "Language: {lang}",
    langPickerTitle: "Select language",
    langPickerSearchPlaceholder: "Search language...",

    shortcutsHint:
      "1·2·3 tabs  |  / search  |  H history  |  W wlist  |  T theme  |  Esc close",

    devTitle: "Error Simulation",
    devDescription: "Select a scenario to simulate API behavior.",
    devClear: "Clear simulation",
    devHint: "Settings persist in local storage.",
    devClose: "Close",

    badgeInaccessible: "Inaccessible",
    badgeMutual: "Mutual",
    badgeNew: "New",
    badgeWhitelist: "Ignored",
    badgeFollowed: "Followed you",
    badgeNotFollowingBack: "Doesn't follow you",
    badgeUnfollowed: "Unfollowed",

    actionFollow: "Follow",
    actionUnfollow: "Unfollow",
    actionRemove: "Remove",
    actionViewProfile: "View profile",
    actionWhitelistAdd: "Always ignore",
    actionWhitelistRemove: "Remove from whitelist",

    loadingProfile: "Fetching your profile...",
    loadingFollowing: "Loading following list...",
    loadingFollowers: "Loading followers list...",
    loadingCalculating: "Calculating...",

    processingLabel: "Processing",
    resumingLabel: "Resuming",
    cancelledLabel: "Cancelled ({done}/{total})",
    cancellingLabel: "Cancelling...",

    connectChecking: "Verifying...",
    connectErrorNoToken: "Paste your Personal Access Token above.",
    connectErrorExpired: "Invalid or expired token. Generate a new one.",
    connectErrorSession:
      "Session expired. Your token has been removed. Login again.",
    connectErrorTokenExpired:
      "Saved token expired or was revoked. Generate a new one.",

    errorTitle: "Something went wrong",
    errorRetry: "Try again",

    errorUnfollowInaccessible:
      "Could not unfollow {login}: inaccessible profile.",
    errorRateLimit: "Too many requests. Please wait and try again.",
    errorGitHubTemp: "Temporary GitHub error. Please try again.",
    errorUnfollow: "Error unfollowing {login}: {message}",
    errorFollow: "Error following {login}: {message}",

    importErrorFormat: "Invalid file format.",
    importErrorGeneric: "Error importing: {message}",

    http400: "Something was sent incorrectly. Please try again.",
    http401: "Your session expired. Please log in again.",
    http403:
      "GitHub blocked this request. You may have hit a rate limit or lack permission.",
    http404: "Could not find this resource on GitHub.",
    http422:
      "GitHub refused this operation. Check if the profile is public or has restrictions.",
    http429:
      "Too many requests in a short time. Please wait a few minutes and try again.",
    http500:
      "Something went wrong on GitHub's servers. This is temporary — try again shortly.<br>{statusLink}",
    http502:
      "GitHub is temporarily down. Please try again shortly.<br>{statusLink}",
    http503:
      "GitHub is temporarily unavailable, possibly under maintenance. Try again in a few minutes.<br>{statusLink}",
    http504:
      "The connection to GitHub timed out. Check your internet and try again.<br>{statusLink}",
    httpUnknown:
      "An unexpected GitHub error occurred (HTTP {status}). Please try again.",
    httpStatusLink: "Check GitHub status",

    bgNetworkError: "Network error",

    apiTimeout: "The request timed out. Check your connection.",
    apiNetworkError: "No internet connection. Check your network.",
  },

  zh: {
    tokenStep1Title: "创建您的令牌",
    tokenStep1Desc:
      '范围 <code>read:user</code> + <code>user:follow</code> 已预选。滚动到页面底部，点击 <strong>Generate token</strong>。',
    btnCreateToken: "打开 GitHub 令牌页面",
    tokenStep2Title: "复制令牌",
    tokenStep2Desc: "以 <code>ghp_</code> 开头",
    tokenStep3Title: "粘贴并连接",
    tokenStep3Desc: '在下方字段中，点击"连接"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "连接",
    reportProblem: "报告问题",

    headerFollowers: "关注者",

    navResults: "列表",
    navHistory: "历史",
    navWhitelist: "白名单",

    tabAll: "未回关",
    tabNotFollowingBack: "未关注",
    tabMutual: "互相关注",

    searchPlaceholder: "按用户名筛选... (/)",

    listLabelUnfollowers: "未回关你的人",
    listLabelMutual: "互关好友",
    listLabelNotFollowingBack: "关注你的人",

    btnCancel: "取消",
    btnFollowAll: "全部关注",
    btnUnfollowAll: "全部取消关注",
    btnShow: "显示",
    btnHide: "隐藏",

    emptyFiltered: "没有符合筛选条件的结果。",
    allFollowingBackTitle: "<strong>一切正常！</strong>",
    allFollowingBackAll: "<strong>一切正常！</strong>你关注的人都在回关你。",
    allFollowingBackMutual: "<strong>没有互关好友。</strong>",
    allFollowingBackNotFollowingBack: "<strong>所有关注你的人你都已经回关了。</strong>",

    unfollowableBanner: "有 {count} 个账号无法自动关注。",

    historyTitle: "历史",
    historyHint: "30 天",
    btnClearHistory: "清除",
    historyEmpty: "暂无记录。",
    historyTimeNow: "刚刚",

    whitelistTitle: "白名单",
    whitelistHint: "已忽略",
    whitelistEmpty: "白名单中暂无用户。",

    profileFollowers: "关注者",
    profileFollowing: "正在关注",
    profileRepos: "仓库",
    profilePopularRepos: "热门仓库",
    profileNoRepos: "暂无公开仓库。",
    profileLoading: "加载中...",
    profileClose: "关闭 (Esc)",
    profileWhitelistAdd: "始终忽略",
    profileWhitelistRemove: "从白名单移除",

    modalCancel: "取消",
    modalTitleUnfollow: "取消关注？",
    modalTitleFollow: "回关？",
    modalTitleImport: "导入数据？",
    modalTextUnfollow:
      "您即将取消关注 <strong>{count}</strong> 个未回关您的用户。",
    modalTextFollow:
      "您即将关注 <strong>{count}</strong> 个关注您的用户。",
    modalTextResumeFollow:
      "您即将关注 <strong>{count}</strong> 个关注您的用户。",
    modalTextResumeUnfollow:
      "您即将取消关注 <strong>{count}</strong> 个未回关您的用户。",
    modalTextImport:
      "导入 <strong>{whitelistCount}</strong> 个白名单用户和 <strong>{historyCount}</strong> 条历史记录。<br><br>当前数据将被替换。",
    modalConfirmUnfollow: "是的，取消关注",
    modalConfirmFollow: "是的，关注",
    modalConfirmImport: "是的，导入",

    menuTheme: "切换主题",
    menuRefresh: "刷新数据",
    menuExport: "导出数据",
    menuImport: "导入数据",
    menuDev: "模拟错误",
    menuReport: "报告问题",
    menuLogout: "断开连接",
    menuLanguage: "语言: {lang}",
    langPickerTitle: "选择语言",
    langPickerSearchPlaceholder: "搜索语言...",

    shortcutsHint: "1·2·3 标签  |  / 搜索  |  H 历史  |  W 白名单  |  T 主题  |  Esc 关闭",

    devTitle: "错误模拟",
    devDescription: "选择一个场景来模拟 API 行为。",
    devClear: "清除模拟",
    devHint: "设置保存在本地存储中。",
    devClose: "关闭",

    badgeInaccessible: "无法访问",
    badgeMutual: "互关",
    badgeNew: "新",
    badgeWhitelist: "已忽略",
    badgeFollowed: "关注了你",
    badgeNotFollowingBack: "未回关你",
    badgeUnfollowed: "已取消关注",

    actionFollow: "关注",
    actionUnfollow: "取消关注",
    actionRemove: "移除",
    actionViewProfile: "查看资料",
    actionWhitelistAdd: "始终忽略",
    actionWhitelistRemove: "从白名单移除",

    loadingProfile: "正在获取你的资料...",
    loadingFollowing: "正在加载关注列表...",
    loadingFollowers: "正在加载关注者列表...",
    loadingCalculating: "正在计算...",

    processingLabel: "处理中",
    resumingLabel: "恢复中",
    cancelledLabel: "已取消 ({done}/{total})",
    cancellingLabel: "取消中...",

    connectChecking: "验证中...",
    connectErrorNoToken: "请在上方粘贴您的 Personal Access Token。",
    connectErrorExpired: "令牌无效或已过期。请生成新令牌。",
    connectErrorSession: "会话已过期。令牌已被移除。请重新登录。",
    connectErrorTokenExpired: "保存的令牌已过期或已被撤销。请生成新令牌。",

    errorTitle: "出了点问题",
    errorRetry: "重试",

    errorUnfollowInaccessible: "无法取消关注 {login}：资料无法访问。",
    errorRateLimit: "请求过多。请稍后重试。",
    errorGitHubTemp: "GitHub 临时错误。请重试。",
    errorUnfollow: "取消关注 {login} 时出错：{message}",
    errorFollow: "关注 {login} 时出错：{message}",

    importErrorFormat: "文件格式无效。",
    importErrorGeneric: "导入时出错：{message}",

    http400: "发送的内容有误。请重试。",
    http401: "会话已过期。请重新登录。",
    http403: "GitHub 已阻止此请求。您可能已达到速率限制或缺少权限。",
    http404: "在 GitHub 上找不到此资源。",
    http422: "GitHub 拒绝了此操作。请检查资料是否为公开或有其他限制。",
    http429: "短时间内请求过多。请稍等几分钟再试。",
    http500: "GitHub 服务器出了点问题。这是暂时性的——请稍后重试。<br>{statusLink}",
    http502: "GitHub 暂时离线。请稍后重试。<br>{statusLink}",
    http503: "GitHub 暂时不可用，可能正在维护。请稍后重试。<br>{statusLink}",
    http504: "与 GitHub 的连接超时。请检查网络后重试。<br>{statusLink}",
    httpUnknown: "发生了意外的 GitHub 错误 (HTTP {status})。请重试。",
    httpStatusLink: "查看 GitHub 状态",

    bgNetworkError: "网络错误",

    apiTimeout: "请求超时。请检查您的连接。",
    apiNetworkError: "无网络连接。请检查您的网络。",
  },

  es: {
    tokenStep1Title: "Crea tu token",
    tokenStep1Desc:
      'Los ámbitos <code>read:user</code> + <code>user:follow</code> están preseleccionados. Desplázate hasta el final de la página y haz clic en <strong>Generate token</strong>.',
    btnCreateToken: "Abrir página de tokens en GitHub",
    tokenStep2Title: "Copia el token",
    tokenStep2Desc: "Comienza con <code>ghp_</code>",
    tokenStep3Title: "Pega y conecta",
    tokenStep3Desc: 'En el campo de abajo, haz clic en "Conectar"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Conectar",
    reportProblem: "Reportar problema",

    headerFollowers: "seguidores",

    navResults: "Listas",
    navHistory: "Historial",
    navWhitelist: "Lista blanca",

    tabAll: "No siguen",
    tabNotFollowingBack: "No sigo",
    tabMutual: "Mutuales",

    searchPlaceholder: "Filtrar por usuario... (/)",

    listLabelUnfollowers: "No te siguen de vuelta",
    listLabelMutual: "Seguidores mutuos",
    listLabelNotFollowingBack: "Quienes te siguen",

    btnCancel: "Cancelar",
    btnFollowAll: "Seguir a todos",
    btnUnfollowAll: "Dejar de seguir a todos",
    btnShow: "Mostrar",
    btnHide: "Ocultar",

    emptyFiltered: "Sin resultados para este filtro.",
    allFollowingBackTitle: "<strong>¡Todo en orden!</strong>",
    allFollowingBackAll: "<strong>¡Todo en orden!</strong> Todos a quienes sigues te siguen de vuelta.",
    allFollowingBackMutual: "<strong>No hay seguidores mutuos.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Ya sigues de vuelta a todos los que te siguen.</strong>",

    unfollowableBanner: "{count} cuentas no pueden seguirse automáticamente.",

    historyTitle: "Historial",
    historyHint: "30 días",
    btnClearHistory: "Limpiar",
    historyEmpty: "Aún no se registraron eventos.",
    historyTimeNow: "justo ahora",

    whitelistTitle: "Lista blanca",
    whitelistHint: "Ignorados",
    whitelistEmpty: "No hay usuarios en la lista blanca.",

    profileFollowers: "seguidores",
    profileFollowing: "siguiendo",
    profileRepos: "repos",
    profilePopularRepos: "Repositorios populares",
    profileNoRepos: "No hay repositorios públicos.",
    profileLoading: "Cargando...",
    profileClose: "Cerrar (Esc)",
    profileWhitelistAdd: "Ignorar siempre",
    profileWhitelistRemove: "Eliminar de la lista blanca",

    modalCancel: "Cancelar",
    modalTitleUnfollow: "¿Dejar de seguir?",
    modalTitleFollow: "¿Seguir de vuelta?",
    modalTitleImport: "¿Importar datos?",
    modalTextUnfollow:
      "Estás a punto de dejar de seguir a <strong>{count}</strong> usuario(s) que no te siguen de vuelta.",
    modalTextFollow:
      "Estás a punto de seguir a <strong>{count}</strong> usuario(s) que te siguen.",
    modalTextResumeFollow:
      "Estás a punto de seguir a <strong>{count}</strong> usuario(s) que te siguen.",
    modalTextResumeUnfollow:
      "Estás a punto de dejar de seguir a <strong>{count}</strong> usuario(s) que no te siguen de vuelta.",
    modalTextImport:
      "Importar <strong>{whitelistCount}</strong> usuario(s) de la lista blanca y <strong>{historyCount}</strong> evento(s) de historial.<br><br>Los datos actuales se reemplazarán.",
    modalConfirmUnfollow: "Sí, dejar de seguir",
    modalConfirmFollow: "Sí, seguir",
    modalConfirmImport: "Sí, importar",

    menuTheme: "Cambiar tema",
    menuRefresh: "Actualizar datos",
    menuExport: "Exportar datos",
    menuImport: "Importar datos",
    menuDev: "Simular errores",
    menuReport: "Reportar problema",
    menuLogout: "Desconectar",
    menuLanguage: "Idioma: {lang}",
    langPickerTitle: "Selecionar idioma",
    langPickerSearchPlaceholder: "Pesquisar idioma...",

    shortcutsHint: "1·2·3 pestañas  |  / buscar  |  H historial  |  W lista blanca  |  T tema  |  Esc cerrar",

    devTitle: "Simulación de Errores",
    devDescription: "Selecciona un escenario para simular el comportamiento de la API.",
    devClear: "Limpiar simulación",
    devHint: "La configuración persiste en el almacenamiento local.",
    devClose: "Cerrar",

    badgeInaccessible: "Inaccesible",
    badgeMutual: "Mutuo",
    badgeNew: "Nuevo",
    badgeWhitelist: "Ignorado",
    badgeFollowed: "Te siguió",
    badgeNotFollowingBack: "No te sigue",
    badgeUnfollowed: "Dejó de seguir",

    actionFollow: "Seguir",
    actionUnfollow: "Dejar de seguir",
    actionRemove: "Eliminar",
    actionViewProfile: "Ver perfil",
    actionWhitelistAdd: "Ignorar siempre",
    actionWhitelistRemove: "Eliminar de lista blanca",

    loadingProfile: "Obteniendo tu perfil...",
    loadingFollowing: "Cargando lista de seguidos...",
    loadingFollowers: "Cargando lista de seguidores...",
    loadingCalculating: "Calculando...",

    processingLabel: "Procesando",
    resumingLabel: "Reanudando",
    cancelledLabel: "Cancelado ({done}/{total})",
    cancellingLabel: "Cancelando...",

    connectChecking: "Verificando...",
    connectErrorNoToken: "Pega tu Personal Access Token arriba.",
    connectErrorExpired: "Token inválido o expirado. Genera uno nuevo.",
    connectErrorSession: "Sesión expirada. Tu token fue eliminado. Inicia sesión de nuevo.",
    connectErrorTokenExpired: "El token guardado expiró o fue revocado. Genera uno nuevo.",

    errorTitle: "Algo salió mal",
    errorRetry: "Intentar de nuevo",

    errorUnfollowInaccessible: "No se pudo dejar de seguir a {login}: perfil inaccesible.",
    errorRateLimit: "Demasiadas solicitudes. Espera e intenta de nuevo.",
    errorGitHubTemp: "Error temporal de GitHub. Intenta de nuevo.",
    errorUnfollow: "Error al dejar de seguir a {login}: {message}",
    errorFollow: "Error al seguir a {login}: {message}",

    importErrorFormat: "Formato de archivo inválido.",
    importErrorGeneric: "Error al importar: {message}",

    http400: "Algo se envió incorrectamente. Intenta de nuevo.",
    http401: "Tu sesión expiró. Inicia sesión de nuevo.",
    http403: "GitHub bloqueó esta solicitud. Puede que hayas alcanzado el límite de uso o no tengas permiso.",
    http404: "No se pudo encontrar este recurso en GitHub.",
    http422: "GitHub rechazó esta operación. Verifica si el perfil es público o tiene restricciones.",
    http429: "Demasiadas solicitudes en poco tiempo. Espera unos minutos e intenta de nuevo.",
    http500: "Algo salió mal en los servidores de GitHub. Es temporal — inténtalo de nuevo en unos instantes.<br>{statusLink}",
    http502: "GitHub está temporalmente fuera de servicio. Inténtalo de nuevo en unos instantes.<br>{statusLink}",
    http503: "GitHub no está disponible temporalmente, posiblemente en mantenimiento. Intenta de nuevo en unos minutos.<br>{statusLink}",
    http504: "La conexión con GitHub tardó demasiado y se interrumpió. Verifica tu internet e intenta de nuevo.<br>{statusLink}",
    httpUnknown: "Ocurrió un error inesperado de GitHub (HTTP {status}). Intenta de nuevo.",
    httpStatusLink: "Ver estado de GitHub",

    bgNetworkError: "Error de red",

    apiTimeout: "La solicitud excedió el tiempo de espera. Verifica tu conexión.",
    apiNetworkError: "Sin conexión a internet. Verifica tu red.",
  },

  hi: {
    tokenStep1Title: "अपना टोकन बनाएं",
    tokenStep1Desc:
      'स्कोप <code>read:user</code> + <code>user:follow</code> पहले से चयनित हैं। पेज के अंत तक स्क्रॉल करें और <strong>Generate token</strong> पर क्लिक करें।',
    btnCreateToken: "GitHub टोकन पेज खोलें",
    tokenStep2Title: "टोकन कॉपी करें",
    tokenStep2Desc: "<code>ghp_</code> से शुरू होता है",
    tokenStep3Title: "पेस्ट करें और कनेक्ट करें",
    tokenStep3Desc: 'नीचे दिए गए फ़ील्ड में, "कनेक्ट करें" पर क्लिक करें',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "कनेक्ट करें",
    reportProblem: "समस्या रिपोर्ट करें",

    headerFollowers: "अनुयायी",

    navResults: "सूचियाँ",
    navHistory: "इतिहास",
    navWhitelist: "श्वेतसूची",

    tabAll: "पालन नहीं करने वाले",
    tabNotFollowingBack: "पालन नहीं करता",
    tabMutual: "आपसी",

    searchPlaceholder: "उपयोगकर्ता नाम से फ़िल्टर करें... (/)",

    listLabelUnfollowers: "आपको वापस पालन नहीं कर रहे",
    listLabelMutual: "आपसी अनुयायी",
    listLabelNotFollowingBack: "जो आपको पालन करते हैं",

    btnCancel: "रद्द करें",
    btnFollowAll: "सभी को पालन करें",
    btnUnfollowAll: "सभी का पालन छोड़ें",
    btnShow: "दिखाएँ",
    btnHide: "छिपाएँ",

    emptyFiltered: "इस फ़िल्टर के लिए कोई परिणाम नहीं।",
    allFollowingBackTitle: "<strong>सब ठीक है!</strong>",
    allFollowingBackAll: "<strong>सब ठीक है!</strong> आप जिन्हें पालन करते हैं वे सब आपको वापस पालन करते हैं।",
    allFollowingBackMutual: "<strong>कोई आपसी अनुयायी नहीं।</strong>",
    allFollowingBackNotFollowingBack: "<strong>जो भी आपको पालन करता है, आप उन्हें वापस पालन करते हैं।</strong>",

    unfollowableBanner: "{count} खातों को स्वचालित रूप से पालन नहीं किया जा सकता।",

    historyTitle: "इतिहास",
    historyHint: "30 दिन",
    btnClearHistory: "साफ़ करें",
    historyEmpty: "अभी तक कोई घटना दर्ज नहीं हुई।",
    historyTimeNow: "अभी",

    whitelistTitle: "श्वेतसूची",
    whitelistHint: "अनदेखा",
    whitelistEmpty: "श्वेतसूची में कोई उपयोगकर्ता नहीं।",

    profileFollowers: "अनुयायी",
    profileFollowing: "पालन कर रहे",
    profileRepos: "रिपोज़",
    profilePopularRepos: "लोकप्रिय रिपॉजिटरी",
    profileNoRepos: "कोई सार्वजनिक रिपॉजिटरी नहीं।",
    profileLoading: "लोड हो रहा है...",
    profileClose: "बंद करें (Esc)",
    profileWhitelistAdd: "हमेशा अनदेखा करें",
    profileWhitelistRemove: "श्वेतसूची से हटाएँ",

    modalCancel: "रद्द करें",
    modalTitleUnfollow: "पालन छोड़ें?",
    modalTitleFollow: "वापस पालन करें?",
    modalTitleImport: "डेटा आयात करें?",
    modalTextUnfollow:
      "आप <strong>{count}</strong> उपयोगकर्ता(ओं) का पालन छोड़ने वाले हैं जो आपको वापस पालन नहीं करते।",
    modalTextFollow:
      "आप <strong>{count}</strong> उपयोगकर्ता(ओं) को पालन करने वाले हैं जो आपको पालन करते हैं।",
    modalTextResumeFollow:
      "आप <strong>{count}</strong> उपयोगकर्ता(ओं) को पालन करने वाले हैं जो आपको पालन करते हैं।",
    modalTextResumeUnfollow:
      "आप <strong>{count}</strong> उपयोगकर्ता(ओं) का पालन छोड़ने वाले हैं जो आपको वापस पालन नहीं करते।",
    modalTextImport:
      "श्वेतसूची में <strong>{whitelistCount}</strong> उपयोगकर्ता और इतिहास में <strong>{historyCount}</strong> घटना(एँ) आयात करें।<br><br>मौजूदा डेटा बदल दिया जाएगा।",
    modalConfirmUnfollow: "हाँ, पालन छोड़ें",
    modalConfirmFollow: "हाँ, पालन करें",
    modalConfirmImport: "हाँ, आयात करें",

    menuTheme: "थीम बदलें",
    menuRefresh: "डेटा रीफ़्रेश करें",
    menuExport: "डेटा निर्यात करें",
    menuImport: "डेटा आयात करें",
    menuDev: "त्रुटियाँ अनुकरण करें",
    menuReport: "समस्या रिपोर्ट करें",
    menuLogout: "डिस्कनेक्ट करें",
    menuLanguage: "भाषा: {lang}",
    langPickerTitle: "भाषा चुनें",
    langPickerSearchPlaceholder: "भाषा खोजें...",

    shortcutsHint: "1·2·3 टैब  |  / खोज  |  H इतिहास  |  W श्वेतसूची  |  T थीम  |  Esc बंद",

    devTitle: "त्रुटि अनुकरण",
    devDescription: "API व्यवहार अनुकरण करने के लिए एक परिदृश्य चुनें।",
    devClear: "अनुकरण साफ़ करें",
    devHint: "सेटिंग्स स्थानीय संग्रहण में रहती हैं।",
    devClose: "बंद करें",

    badgeInaccessible: "पहुँच से बाहर",
    badgeMutual: "आपसी",
    badgeNew: "नया",
    badgeWhitelist: "अनदेखा",
    badgeFollowed: "आपको पालन किया",
    badgeNotFollowingBack: "आपको पालन नहीं करता",
    badgeUnfollowed: "पालन छोड़ा",

    actionFollow: "पालन करें",
    actionUnfollow: "पालन छोड़ें",
    actionRemove: "हटाएँ",
    actionViewProfile: "प्रोफ़ाइल देखें",
    actionWhitelistAdd: "हमेशा अनदेखा करें",
    actionWhitelistRemove: "श्वेतसूची से हटाएँ",

    loadingProfile: "आपकी प्रोफ़ाइल प्राप्त हो रही है...",
    loadingFollowing: "पालन सूची लोड हो रही है...",
    loadingFollowers: "अनुयायी सूची लोड हो रही है...",
    loadingCalculating: "गणना हो रही है...",

    processingLabel: "प्रसंस्करण",
    resumingLabel: "पुनः शुरू",
    cancelledLabel: "रद्द किया गया ({done}/{total})",
    cancellingLabel: "रद्द किया जा रहा है...",

    connectChecking: "सत्यापित किया जा रहा है...",
    connectErrorNoToken: "ऊपर अपना Personal Access Token पेस्ट करें।",
    connectErrorExpired: "टोकन अमान्य या समाप्त हो गया है। नया टोकन बनाएँ।",
    connectErrorSession: "सत्र समाप्त हो गया। आपका टोकन हटा दिया गया है। फिर से लॉगिन करें।",
    connectErrorTokenExpired: "सहेजा गया टोकन समाप्त या रद्द हो गया है। नया बनाएँ।",

    errorTitle: "कुछ गलत हो गया",
    errorRetry: "पुनः प्रयास करें",

    errorUnfollowInaccessible: "{login} का पालन छोड़ने में असमर्थ: प्रोफ़ाइल पहुँच से बाहर।",
    errorRateLimit: "बहुत अधिक अनुरोध। कृपया प्रतीक्षा करें और पुनः प्रयास करें।",
    errorGitHubTemp: "GitHub की अस्थायी त्रुटि। कृपया पुनः प्रयास करें।",
    errorUnfollow: "{login} का पालन छोड़ने में त्रुटि: {message}",
    errorFollow: "{login} का पालन करने में त्रुटि: {message}",

    importErrorFormat: "अमान्य फ़ाइल प्रारूप।",
    importErrorGeneric: "आयात करने में त्रुटि: {message}",

    http400: "कुछ गलत तरीके से भेजा गया। कृपया पुनः प्रयास करें।",
    http401: "आपका सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें।",
    http403: "GitHub ने इस अनुरोध को अवरुद्ध कर दिया। हो सकता है आप सीमा तक पहुँच गए हों या आपके पास अनुमति न हो।",
    http404: "GitHub पर यह संसाधन नहीं मिल सका।",
    http422: "GitHub ने इस कार्रवाई को अस्वीकार किया। जाँचें कि प्रोफ़ाइल सार्वजनिक है या कोई प्रतिबंध तो नहीं।",
    http429: "थोड़े समय में बहुत अधिक अनुरोध। कृपया कुछ मिनट प्रतीक्षा करें और पुनः प्रयास करें।",
    http500: "GitHub के सर्वरों में कुछ गड़बड़ हुई। यह अस्थायी है — कुछ पलों में पुनः प्रयास करें।<br>{statusLink}",
    http502: "GitHub अस्थायी रूप से डाउन है। कृपया कुछ पलों में पुनः प्रयास करें।<br>{statusLink}",
    http503: "GitHub अस्थायी रूप से अनुपलब्ध है, संभवतः रखरखाव के कारण। कुछ मिनटों में पुनः प्रयास करें।<br>{statusLink}",
    http504: "GitHub के साथ कनेक्शन का समय समाप्त हो गया। अपना इंटरनेट जाँचें और पुनः प्रयास करें।<br>{statusLink}",
    httpUnknown: "एक अप्रत्याशित GitHub त्रुटि हुई (HTTP {status})। कृपया पुनः प्रयास करें।",
    httpStatusLink: "GitHub स्थिति देखें",

    bgNetworkError: "नेटवर्क त्रुटि",

    apiTimeout: "अनुरोध की समय सीमा समाप्त हो गई। अपना कनेक्शन जाँचें।",
    apiNetworkError: "कोई इंटरनेट कनेक्शन नहीं। अपना नेटवर्क जाँचें।",
  },

  ar: {
    tokenStep1Title: "أنشئ رمزك المميز",
    tokenStep1Desc:
      'النطاقات <code>read:user</code> + <code>user:follow</code> محددة مسبقًا. انتقل إلى أسفل الصفحة وانقر على <strong>Generate token</strong>.',
    btnCreateToken: "فتح صفحة الرموز المميزة في GitHub",
    tokenStep2Title: "انسخ الرمز المميز",
    tokenStep2Desc: "يبدأ بـ <code>ghp_</code>",
    tokenStep3Title: "الصق واتصل",
    tokenStep3Desc: 'في الحقل أدناه، انقر على "اتصال"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "اتصال",
    reportProblem: "الإبلاغ عن مشكلة",

    headerFollowers: "متابعون",

    navResults: "قوائم",
    navHistory: "السجل",
    navWhitelist: "القائمة البيضاء",

    tabAll: "لا يتابعونني",
    tabNotFollowingBack: "لا أتابعهم",
    tabMutual: "متبادل",

    searchPlaceholder: "تصفية حسب اسم المستخدم... (/)",

    listLabelUnfollowers: "لا يتابعونك بالمقابل",
    listLabelMutual: "متابعون متبادلون",
    listLabelNotFollowingBack: "من يتابعك",

    btnCancel: "إلغاء",
    btnFollowAll: "متابعة الكل",
    btnUnfollowAll: "إلغاء متابعة الكل",
    btnShow: "إظهار",
    btnHide: "إخفاء",

    emptyFiltered: "لا توجد نتائج لهذا الفلتر.",
    allFollowingBackTitle: "<strong>كل شيء على ما يرام!</strong>",
    allFollowingBackAll: "<strong>كل شيء على ما يرام!</strong> كل من تتابعهم يتابعونك بالمقابل.",
    allFollowingBackMutual: "<strong>لا يوجد متابعون متبادلون.</strong>",
    allFollowingBackNotFollowingBack: "<strong>كل من يتابعك، تتابعهم بالمقابل بالفعل.</strong>",

    unfollowableBanner: "لا يمكن متابعة {count} حساب تلقائيًا.",

    historyTitle: "السجل",
    historyHint: "30 يومًا",
    btnClearHistory: "مسح",
    historyEmpty: "لم يتم تسجيل أي أحداث بعد.",
    historyTimeNow: "الآن",

    whitelistTitle: "القائمة البيضاء",
    whitelistHint: "تم التجاهل",
    whitelistEmpty: "لا يوجد مستخدمون في القائمة البيضاء.",

    profileFollowers: "متابعون",
    profileFollowing: "يتابع",
    profileRepos: "المستودعات",
    profilePopularRepos: "المستودعات الشائعة",
    profileNoRepos: "لا توجد مستودعات عامة.",
    profileLoading: "جارٍ التحميل...",
    profileClose: "إغلاق (Esc)",
    profileWhitelistAdd: "تجاهل دائمًا",
    profileWhitelistRemove: "إزالة من القائمة البيضاء",

    modalCancel: "إلغاء",
    modalTitleUnfollow: "إلغاء المتابعة؟",
    modalTitleFollow: "متابعة بالمقابل؟",
    modalTitleImport: "استيراد البيانات؟",
    modalTextUnfollow:
      "أنت على وشك إلغاء متابعة <strong>{count}</strong> مستخدم(ين) لا يتابعونك بالمقابل.",
    modalTextFollow:
      "أنت على وشك متابعة <strong>{count}</strong> مستخدم(ين) يتابعونك.",
    modalTextResumeFollow:
      "أنت على وشك متابعة <strong>{count}</strong> مستخدم(ين) يتابعونك.",
    modalTextResumeUnfollow:
      "أنت على وشك إلغاء متابعة <strong>{count}</strong> مستخدم(ين) لا يتابعونك بالمقابل.",
    modalTextImport:
      "استيراد <strong>{whitelistCount}</strong> مستخدم(ين) في القائمة البيضاء و<strong>{historyCount}</strong> حدث(أحداث) من السجل.<br><br>سيتم استبدال البيانات الحالية.",
    modalConfirmUnfollow: "نعم، إلغاء المتابعة",
    modalConfirmFollow: "نعم، متابعة",
    modalConfirmImport: "نعم، استيراد",

    menuTheme: "تبديل السمة",
    menuRefresh: "تحديث البيانات",
    menuExport: "تصدير البيانات",
    menuImport: "استيراد البيانات",
    menuDev: "محاكاة الأخطاء",
    menuReport: "الإبلاغ عن مشكلة",
    menuLogout: "قطع الاتصال",
    menuLanguage: "اللغة: {lang}",
    langPickerTitle: "اختر اللغة",
    langPickerSearchPlaceholder: "ابحث عن لغة...",

    shortcutsHint: "1·2·3 علامات تبويب  |  / بحث  |  H السجل  |  W القائمة البيضاء  |  T السمة  |  Esc إغلاق",

    devTitle: "محاكاة الأخطاء",
    devDescription: "اختر سيناريو لمحاكاة سلوك API.",
    devClear: "مسح المحاكاة",
    devHint: "الإعدادات تبقى في التخزين المحلي.",
    devClose: "إغلاق",

    badgeInaccessible: "غير قابل للوصول",
    badgeMutual: "متبادل",
    badgeNew: "جديد",
    badgeWhitelist: "تم التجاهل",
    badgeFollowed: "تابعك",
    badgeNotFollowingBack: "لا يتابعك",
    badgeUnfollowed: "ألغى المتابعة",

    actionFollow: "متابعة",
    actionUnfollow: "إلغاء متابعة",
    actionRemove: "إزالة",
    actionViewProfile: "عرض الملف الشخصي",
    actionWhitelistAdd: "تجاهل دائمًا",
    actionWhitelistRemove: "إزالة من القائمة البيضاء",

    loadingProfile: "جارٍ الحصول على ملفك الشخصي...",
    loadingFollowing: "جارٍ تحميل قائمة المتابَعين...",
    loadingFollowers: "جارٍ تحميل قائمة المتابعين...",
    loadingCalculating: "جارٍ الحساب...",

    processingLabel: "جارٍ المعالجة",
    resumingLabel: "جارٍ الاستئناف",
    cancelledLabel: "ملغي ({done}/{total})",
    cancellingLabel: "جارٍ الإلغاء...",

    connectChecking: "جارٍ التحقق...",
    connectErrorNoToken: "الصق رمز Personal Access Token الخاص بك بالأعلى.",
    connectErrorExpired: "الرمز المميز غير صالح أو منتهي الصلاحية. أنشئ رمزًا جديدًا.",
    connectErrorSession: "انتهت الجلسة. تمت إزالة رمزك المميز. سجل الدخول مرة أخرى.",
    connectErrorTokenExpired: "الرمز المميز المحفوظ انتهت صلاحيته أو تم إبطاله. أنشئ رمزًا جديدًا.",

    errorTitle: "حدث خطأ ما",
    errorRetry: "حاول مرة أخرى",

    errorUnfollowInaccessible: "تعذر إلغاء متابعة {login}: الملف الشخصي غير قابل للوصول.",
    errorRateLimit: "عدد كبير جدًا من الطلبات. انتظر وحاول مرة أخرى.",
    errorGitHubTemp: "خطأ مؤقت في GitHub. حاول مرة أخرى.",
    errorUnfollow: "خطأ أثناء إلغاء متابعة {login}: {message}",
    errorFollow: "خطأ أثناء متابعة {login}: {message}",

    importErrorFormat: "تنسيق ملف غير صالح.",
    importErrorGeneric: "خطأ أثناء الاستيراد: {message}",

    http400: "تم إرسال شيء بشكل غير صحيح. حاول مرة أخرى.",
    http401: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
    http403: "قام GitHub بحظر هذا الطلب. ربما وصلت إلى حد الاستخدام أو ليس لديك الإذن.",
    http404: "تعذر العثور على هذا المورد على GitHub.",
    http422: "رفض GitHub هذه العملية. تحقق مما إذا كان الملف الشخصي عامًا أو إذا كانت هناك قيود.",
    http429: "لقد أرسلت طلبات كثيرة جدًا في وقت قصير. انتظر بضع دقائق وحاول مرة أخرى.",
    http500: "حدث خطأ ما في خوادم GitHub. هذا مؤقت — حاول مرة أخرى بعد قليل.<br>{statusLink}",
    http502: "GitHub معطل مؤقتًا. حاول مرة أخرى بعد قليل.<br>{statusLink}",
    http503: "GitHub غير متاح مؤقتًا، ربما بسبب الصيانة. حاول مرة أخرى بعد بضع دقائق.<br>{statusLink}",
    http504: "انتهت مهلة الاتصال بـ GitHub. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.<br>{statusLink}",
    httpUnknown: "حدث خطأ غير متوقع في GitHub (HTTP {status}). حاول مرة أخرى.",
    httpStatusLink: "التحقق من حالة GitHub",

    bgNetworkError: "خطأ في الشبكة",

    apiTimeout: "انتهت مهلة الطلب. تحقق من اتصالك.",
    apiNetworkError: "لا يوجد اتصال بالإنترنت. تحقق من شبكتك.",
  },

  fr: {
    tokenStep1Title: "Créez votre jeton",
    tokenStep1Desc:
      'Les portées <code>read:user</code> + <code>user:follow</code> sont présélectionnées. Faites défiler jusqu\'en bas de la page et cliquez sur <strong>Generate token</strong>.',
    btnCreateToken: "Ouvrir la page des jetons GitHub",
    tokenStep2Title: "Copiez le jeton",
    tokenStep2Desc: "Commence par <code>ghp_</code>",
    tokenStep3Title: "Collez et connectez",
    tokenStep3Desc: 'Dans le champ ci-dessous, cliquez sur "Connecter"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Connecter",
    reportProblem: "Signaler un problème",

    headerFollowers: "abonnés",

    navResults: "Listes",
    navHistory: "Historique",
    navWhitelist: "Liste blanche",

    tabAll: "Ne suivent pas",
    tabNotFollowingBack: "Ne suis pas",
    tabMutual: "Mutuals",

    searchPlaceholder: "Filtrer par nom d'utilisateur... (/)",

    listLabelUnfollowers: "Ne vous suivent pas en retour",
    listLabelMutual: "Abonnés mutuels",
    listLabelNotFollowingBack: "Qui vous suit",

    btnCancel: "Annuler",
    btnFollowAll: "Suivre tous",
    btnUnfollowAll: "Ne plus suivre tous",
    btnShow: "Afficher",
    btnHide: "Masquer",

    emptyFiltered: "Aucun résultat pour ce filtre.",
    allFollowingBackTitle: "<strong>Tout est bon !</strong>",
    allFollowingBackAll: "<strong>Tout est bon !</strong> Tous ceux que vous suivez vous suivent en retour.",
    allFollowingBackMutual: "<strong>Aucun abonné mutuel.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Vous suivez déjà en retour tous ceux qui vous suivent.</strong>",

    unfollowableBanner: "{count} comptes ne peuvent pas être suivis automatiquement.",

    historyTitle: "Historique",
    historyHint: "30 jours",
    btnClearHistory: "Effacer",
    historyEmpty: "Aucun événement enregistré pour le moment.",
    historyTimeNow: "à l'instant",

    whitelistTitle: "Liste blanche",
    whitelistHint: "Ignorés",
    whitelistEmpty: "Aucun utilisateur dans la liste blanche.",

    profileFollowers: "abonnés",
    profileFollowing: "abonnements",
    profileRepos: "dépôts",
    profilePopularRepos: "Dépôts populaires",
    profileNoRepos: "Aucun dépôt public.",
    profileLoading: "Chargement...",
    profileClose: "Fermer (Échap)",
    profileWhitelistAdd: "Toujours ignorer",
    profileWhitelistRemove: "Retirer de la liste blanche",

    modalCancel: "Annuler",
    modalTitleUnfollow: "Se désabonner ?",
    modalTitleFollow: "Suivre en retour ?",
    modalTitleImport: "Importer des données ?",
    modalTextUnfollow:
      "Vous êtes sur le point de ne plus suivre <strong>{count}</strong> utilisateur(s) qui ne vous suivent pas en retour.",
    modalTextFollow:
      "Vous êtes sur le point de suivre <strong>{count}</strong> utilisateur(s) qui vous suivent.",
    modalTextResumeFollow:
      "Vous êtes sur le point de suivre <strong>{count}</strong> utilisateur(s) qui vous suivent.",
    modalTextResumeUnfollow:
      "Vous êtes sur le point de ne plus suivre <strong>{count}</strong> utilisateur(s) qui ne vous suivent pas en retour.",
    modalTextImport:
      "Importer <strong>{whitelistCount}</strong> utilisateur(s) de la liste blanche et <strong>{historyCount}</strong> événement(s) d'historique.<br><br>Les données actuelles seront remplacées.",
    modalConfirmUnfollow: "Oui, ne plus suivre",
    modalConfirmFollow: "Oui, suivre",
    modalConfirmImport: "Oui, importer",

    menuTheme: "Changer de thème",
    menuRefresh: "Actualiser les données",
    menuExport: "Exporter les données",
    menuImport: "Importer les données",
    menuDev: "Simuler des erreurs",
    menuReport: "Signaler un problème",
    menuLogout: "Se déconnecter",
    menuLanguage: "Langue : {lang}",
    langPickerTitle: "Choisir la langue",
    langPickerSearchPlaceholder: "Rechercher une langue...",

    shortcutsHint: "1·2·3 onglets  |  / rechercher  |  H historique  |  W liste blanche  |  T thème  |  Échap fermer",

    devTitle: "Simulation d'erreurs",
    devDescription: "Sélectionnez un scénario pour simuler le comportement de l'API.",
    devClear: "Effacer la simulation",
    devHint: "Les paramètres persistent dans le stockage local.",
    devClose: "Fermer",

    badgeInaccessible: "Inaccessible",
    badgeMutual: "Mutuel",
    badgeNew: "Nouveau",
    badgeWhitelist: "Ignoré",
    badgeFollowed: "Vous a suivi",
    badgeNotFollowingBack: "Ne vous suit pas",
    badgeUnfollowed: "Ne suit plus",

    actionFollow: "Suivre",
    actionUnfollow: "Ne plus suivre",
    actionRemove: "Retirer",
    actionViewProfile: "Voir le profil",
    actionWhitelistAdd: "Toujours ignorer",
    actionWhitelistRemove: "Retirer de la liste blanche",

    loadingProfile: "Récupération de votre profil...",
    loadingFollowing: "Chargement de la liste des abonnements...",
    loadingFollowers: "Chargement de la liste des abonnés...",
    loadingCalculating: "Calcul en cours...",

    processingLabel: "Traitement",
    resumingLabel: "Reprise",
    cancelledLabel: "Annulé ({done}/{total})",
    cancellingLabel: "Annulation...",

    connectChecking: "Vérification...",
    connectErrorNoToken: "Collez votre Personal Access Token ci-dessus.",
    connectErrorExpired: "Jeton invalide ou expiré. Générez un nouveau jeton.",
    connectErrorSession: "Session expirée. Votre jeton a été supprimé. Connectez-vous à nouveau.",
    connectErrorTokenExpired: "Le jeton sauvegardé a expiré ou a été révoqué. Générez-en un nouveau.",

    errorTitle: "Quelque chose s'est mal passé",
    errorRetry: "Réessayer",

    errorUnfollowInaccessible: "Impossible de ne plus suivre {login} : profil inaccessible.",
    errorRateLimit: "Trop de requêtes. Veuillez patienter et réessayer.",
    errorGitHubTemp: "Erreur temporaire de GitHub. Veuillez réessayer.",
    errorUnfollow: "Erreur lors du désabonnement de {login} : {message}",
    errorFollow: "Erreur lors de l'abonnement à {login} : {message}",

    importErrorFormat: "Format de fichier invalide.",
    importErrorGeneric: "Erreur lors de l'importation : {message}",

    http400: "Quelque chose a été envoyé incorrectement. Veuillez réessayer.",
    http401: "Votre session a expiré. Veuillez vous reconnecter.",
    http403: "GitHub a bloqué cette requête. Vous avez peut-être atteint la limite d'utilisation ou n'avez pas la permission.",
    http404: "Impossible de trouver cette ressource sur GitHub.",
    http422: "GitHub a refusé cette opération. Vérifiez si le profil est public ou s'il y a des restrictions.",
    http429: "Trop de requêtes en peu de temps. Veuillez patienter quelques minutes et réessayer.",
    http500: "Quelque chose s'est mal passé sur les serveurs de GitHub. C'est temporaire — réessayez dans quelques instants.<br>{statusLink}",
    http502: "GitHub est temporairement hors service. Réessayez dans quelques instants.<br>{statusLink}",
    http503: "GitHub est temporairement indisponible, probablement en maintenance. Réessayez dans quelques minutes.<br>{statusLink}",
    http504: "La connexion à GitHub a pris trop de temps et a été interrompue. Vérifiez votre connexion Internet et réessayez.<br>{statusLink}",
    httpUnknown: "Une erreur GitHub inattendue s'est produite (HTTP {status}). Veuillez réessayer.",
    httpStatusLink: "Voir l'état de GitHub",

    bgNetworkError: "Erreur réseau",

    apiTimeout: "La requête a dépassé le délai imparti. Vérifiez votre connexion.",
    apiNetworkError: "Pas de connexion Internet. Vérifiez votre réseau.",
  },

  de: {
    tokenStep1Title: "Erstelle deinen Token",
    tokenStep1Desc:
      'Die Bereiche <code>read:user</code> + <code>user:follow</code> sind vorausgewählt. Scrolle zum Ende der Seite und klicke auf <strong>Generate token</strong>.',
    btnCreateToken: "GitHub-Token-Seite öffnen",
    tokenStep2Title: "Kopiere den Token",
    tokenStep2Desc: "Beginnt mit <code>ghp_</code>",
    tokenStep3Title: "Einfügen und verbinden",
    tokenStep3Desc: 'Klicke im unteren Feld auf "Verbinden"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Verbinden",
    reportProblem: "Problem melden",

    headerFollowers: "Follower",

    navResults: "Listen",
    navHistory: "Verlauf",
    navWhitelist: "Whitelist",

    tabAll: "Nicht-follower",
    tabNotFollowingBack: "Folge nicht",
    tabMutual: "Gegenseitig",

    searchPlaceholder: "Nach Benutzername filtern... (/)",

    listLabelUnfollowers: "Folgen dir nicht zurück",
    listLabelMutual: "Gegenseitige Follower",
    listLabelNotFollowingBack: "Wer dir folgt",

    btnCancel: "Abbrechen",
    btnFollowAll: "Allen folgen",
    btnUnfollowAll: "Allen entfolgen",
    btnShow: "Anzeigen",
    btnHide: "Ausblenden",

    emptyFiltered: "Keine Ergebnisse für diesen Filter.",
    allFollowingBackTitle: "<strong>Alles klar!</strong>",
    allFollowingBackAll: "<strong>Alles klar!</strong> Allen, denen du folgst, folgen dir zurück.",
    allFollowingBackMutual: "<strong>Keine gegenseitigen Follower.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Du folgst allen zurück, die dir folgen.</strong>",

    unfollowableBanner: "{count} Konten können nicht automatisch gefolgt werden.",

    historyTitle: "Verlauf",
    historyHint: "30 Tage",
    btnClearHistory: "Löschen",
    historyEmpty: "Noch keine Ereignisse aufgezeichnet.",
    historyTimeNow: "gerade eben",

    whitelistTitle: "Whitelist",
    whitelistHint: "Ignoriert",
    whitelistEmpty: "Keine Benutzer in der Whitelist.",

    profileFollowers: "Follower",
    profileFollowing: "folgt",
    profileRepos: "Repos",
    profilePopularRepos: "Beliebte Repositorys",
    profileNoRepos: "Keine öffentlichen Repositorys.",
    profileLoading: "Laden...",
    profileClose: "Schließen (Esc)",
    profileWhitelistAdd: "Immer ignorieren",
    profileWhitelistRemove: "Aus Whitelist entfernen",

    modalCancel: "Abbrechen",
    modalTitleUnfollow: "Entfolgen?",
    modalTitleFollow: "Zurückfolgen?",
    modalTitleImport: "Daten importieren?",
    modalTextUnfollow:
      "Du bist dabei, <strong>{count}</strong> Benutzer(n) zu entfolgen, die dir nicht zurückfolgen.",
    modalTextFollow:
      "Du bist dabei, <strong>{count}</strong> Benutzer(n) zu folgen, die dir folgen.",
    modalTextResumeFollow:
      "Du bist dabei, <strong>{count}</strong> Benutzer(n) zu folgen, die dir folgen.",
    modalTextResumeUnfollow:
      "Du bist dabei, <strong>{count}</strong> Benutzer(n) zu entfolgen, die dir nicht zurückfolgen.",
    modalTextImport:
      "<strong>{whitelistCount}</strong> Benutzer in die Whitelist und <strong>{historyCount}</strong> Verlaufsereignisse importieren.<br><br>Aktuelle Daten werden ersetzt.",
    modalConfirmUnfollow: "Ja, entfolgen",
    modalConfirmFollow: "Ja, folgen",
    modalConfirmImport: "Ja, importieren",

    menuTheme: "Design wechseln",
    menuRefresh: "Daten aktualisieren",
    menuExport: "Daten exportieren",
    menuImport: "Daten importieren",
    menuDev: "Fehler simulieren",
    menuReport: "Problem melden",
    menuLogout: "Trennen",
    menuLanguage: "Sprache: {lang}",
    langPickerTitle: "Sprache auswählen",
    langPickerSearchPlaceholder: "Sprache suchen...",

    shortcutsHint: "1·2·3 Tabs  |  / Suche  |  H Verlauf  |  W Whitelist  |  T Design  |  Esc schließen",

    devTitle: "Fehlersimulation",
    devDescription: "Wähle ein Szenario, um das API-Verhalten zu simulieren.",
    devClear: "Simulation löschen",
    devHint: "Einstellungen bleiben im lokalen Speicher erhalten.",
    devClose: "Schließen",

    badgeInaccessible: "Unzugänglich",
    badgeMutual: "Gegenseitig",
    badgeNew: "Neu",
    badgeWhitelist: "Ignoriert",
    badgeFollowed: "Folgt dir",
    badgeNotFollowingBack: "Folgt dir nicht",
    badgeUnfollowed: "Entfolgt",

    actionFollow: "Folgen",
    actionUnfollow: "Entfolgen",
    actionRemove: "Entfernen",
    actionViewProfile: "Profil anzeigen",
    actionWhitelistAdd: "Immer ignorieren",
    actionWhitelistRemove: "Aus Whitelist entfernen",

    loadingProfile: "Rufe dein Profil ab...",
    loadingFollowing: "Lade Folge-Liste...",
    loadingFollowers: "Lade Follower-Liste...",
    loadingCalculating: "Berechne...",

    processingLabel: "Verarbeite",
    resumingLabel: "Setze fort",
    cancelledLabel: "Abgebrochen ({done}/{total})",
    cancellingLabel: "Breche ab...",

    connectChecking: "Überprüfe...",
    connectErrorNoToken: "Füge oben deinen Personal Access Token ein.",
    connectErrorExpired: "Ungültiger oder abgelaufener Token. Erstelle einen neuen.",
    connectErrorSession: "Sitzung abgelaufen. Dein Token wurde entfernt. Melde dich erneut an.",
    connectErrorTokenExpired: "Gespeicherter Token ist abgelaufen oder widerrufen. Erstelle einen neuen.",

    errorTitle: "Etwas ist schiefgelaufen",
    errorRetry: "Erneut versuchen",

    errorUnfollowInaccessible: "{login} konnte nicht entfolgt werden: Profil nicht zugänglich.",
    errorRateLimit: "Zu viele Anfragen. Bitte warte und versuche es erneut.",
    errorGitHubTemp: "Vorübergehender GitHub-Fehler. Bitte versuche es erneut.",
    errorUnfollow: "Fehler beim Entfolgen von {login}: {message}",
    errorFollow: "Fehler beim Folgen von {login}: {message}",

    importErrorFormat: "Ungültiges Dateiformat.",
    importErrorGeneric: "Fehler beim Importieren: {message}",

    http400: "Etwas wurde falsch gesendet. Bitte versuche es erneut.",
    http401: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
    http403: "GitHub hat diese Anfrage blockiert. Möglicherweise hast du das Limit erreicht oder keine Berechtigung.",
    http404: "Diese Ressource konnte auf GitHub nicht gefunden werden.",
    http422: "GitHub hat diesen Vorgang abgelehnt. Überprüfe, ob das Profil öffentlich ist oder ob es Einschränkungen gibt.",
    http429: "Zu viele Anfragen in kurzer Zeit. Bitte warte einige Minuten und versuche es erneut.",
    http500: "Auf den GitHub-Servern ist ein Fehler aufgetreten. Dies ist vorübergehend — versuche es in Kürze erneut.<br>{statusLink}",
    http502: "GitHub ist vorübergehend nicht erreichbar. Bitte versuche es in Kürze erneut.<br>{statusLink}",
    http503: "GitHub ist vorübergehend nicht verfügbar, möglicherweise wegen Wartungsarbeiten. Versuche es in einigen Minuten erneut.<br>{statusLink}",
    http504: "Die Verbindung zu GitHub hat zu lange gedauert und wurde unterbrochen. Überprüfe deine Internetverbindung und versuche es erneut.<br>{statusLink}",
    httpUnknown: "Ein unerwarteter GitHub-Fehler ist aufgetreten (HTTP {status}). Bitte versuche es erneut.",
    httpStatusLink: "GitHub-Status prüfen",

    bgNetworkError: "Netzwerkfehler",

    apiTimeout: "Die Anfrage hat das Zeitlimit überschritten. Überprüfe deine Verbindung.",
    apiNetworkError: "Keine Internetverbindung. Überprüfe dein Netzwerk.",
  },

  ja: {
    tokenStep1Title: "トークンを作成",
    tokenStep1Desc:
      'スコープ <code>read:user</code> + <code>user:follow</code> は事前選択されています。ページの一番下までスクロールし、<strong>Generate token</strong> をクリックしてください。',
    btnCreateToken: "GitHubトークンページを開く",
    tokenStep2Title: "トークンをコピー",
    tokenStep2Desc: "<code>ghp_</code> で始まります",
    tokenStep3Title: "貼り付けて接続",
    tokenStep3Desc: '下のフィールドで「接続」をクリックしてください',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "接続",
    reportProblem: "問題を報告",

    headerFollowers: "フォロワー",

    navResults: "リスト",
    navHistory: "履歴",
    navWhitelist: "ホワイトリスト",

    tabAll: "未フォローバック",
    tabNotFollowingBack: "フォローしていない",
    tabMutual: "相互",

    searchPlaceholder: "ユーザー名でフィルター... (/)",

    listLabelUnfollowers: "フォローバックしていないユーザー",
    listLabelMutual: "相互フォロワー",
    listLabelNotFollowingBack: "フォローしているユーザー",

    btnCancel: "キャンセル",
    btnFollowAll: "すべてフォロー",
    btnUnfollowAll: "すべてフォロー解除",
    btnShow: "表示",
    btnHide: "非表示",

    emptyFiltered: "このフィルターの結果はありません。",
    allFollowingBackTitle: "<strong>すべて正常です！</strong>",
    allFollowingBackAll: "<strong>すべて正常です！</strong>フォローしている全員がフォローバックしています。",
    allFollowingBackMutual: "<strong>相互フォロワーはいません。</strong>",
    allFollowingBackNotFollowingBack: "<strong>フォローしている全員をフォローバックしています。</strong>",

    unfollowableBanner: "{count} のアカウントは自動フォローできません。",

    historyTitle: "履歴",
    historyHint: "30日",
    btnClearHistory: "クリア",
    historyEmpty: "まだイベントは記録されていません。",
    historyTimeNow: "たった今",

    whitelistTitle: "ホワイトリスト",
    whitelistHint: "無視済み",
    whitelistEmpty: "ホワイトリストにユーザーはいません。",

    profileFollowers: "フォロワー",
    profileFollowing: "フォロー中",
    profileRepos: "リポジトリ",
    profilePopularRepos: "人気のリポジトリ",
    profileNoRepos: "公開リポジトリはありません。",
    profileLoading: "読み込み中...",
    profileClose: "閉じる (Esc)",
    profileWhitelistAdd: "常に無視",
    profileWhitelistRemove: "ホワイトリストから削除",

    modalCancel: "キャンセル",
    modalTitleUnfollow: "フォロー解除しますか？",
    modalTitleFollow: "フォローバックしますか？",
    modalTitleImport: "データをインポートしますか？",
    modalTextUnfollow:
      "フォローバックしていない <strong>{count}</strong> 人のユーザーのフォローを解除しようとしています。",
    modalTextFollow:
      "あなたをフォローしている <strong>{count}</strong> 人のユーザーをフォローしようとしています。",
    modalTextResumeFollow:
      "あなたをフォローしている <strong>{count}</strong> 人のユーザーをフォローしようとしています。",
    modalTextResumeUnfollow:
      "フォローバックしていない <strong>{count}</strong> 人のユーザーのフォローを解除しようとしています。",
    modalTextImport:
      "ホワイトリストの <strong>{whitelistCount}</strong> 人のユーザーと <strong>{historyCount}</strong> 件の履歴イベントをインポートします。<br><br>現在のデータは置き換えられます。",
    modalConfirmUnfollow: "はい、フォロー解除",
    modalConfirmFollow: "はい、フォロー",
    modalConfirmImport: "はい、インポート",

    menuTheme: "テーマを切り替え",
    menuRefresh: "データを更新",
    menuExport: "データをエクスポート",
    menuImport: "データをインポート",
    menuDev: "エラーをシミュレート",
    menuReport: "問題を報告",
    menuLogout: "切断",
    menuLanguage: "言語: {lang}",
    langPickerTitle: "言語を選択",
    langPickerSearchPlaceholder: "言語を検索...",

    shortcutsHint: "1·2·3 タブ  |  / 検索  |  H 履歴  |  W ホワイトリスト  |  T テーマ  |  Esc 閉じる",

    devTitle: "エラーシミュレーション",
    devDescription: "シナリオを選択してAPIの動作をシミュレートします。",
    devClear: "シミュレーションをクリア",
    devHint: "設定はローカルストレージに保存されます。",
    devClose: "閉じる",

    badgeInaccessible: "アクセス不可",
    badgeMutual: "相互",
    badgeNew: "新規",
    badgeWhitelist: "無視済み",
    badgeFollowed: "フォローされた",
    badgeNotFollowingBack: "フォローバックなし",
    badgeUnfollowed: "フォロー解除済み",

    actionFollow: "フォロー",
    actionUnfollow: "フォロー解除",
    actionRemove: "削除",
    actionViewProfile: "プロフィールを見る",
    actionWhitelistAdd: "常に無視",
    actionWhitelistRemove: "ホワイトリストから削除",

    loadingProfile: "プロフィールを取得中...",
    loadingFollowing: "フォロー中リストを読み込み中...",
    loadingFollowers: "フォロワーリストを読み込み中...",
    loadingCalculating: "計算中...",

    processingLabel: "処理中",
    resumingLabel: "再開中",
    cancelledLabel: "キャンセル済み ({done}/{total})",
    cancellingLabel: "キャンセル中...",

    connectChecking: "確認中...",
    connectErrorNoToken: "上記にPersonal Access Tokenを貼り付けてください。",
    connectErrorExpired: "トークンが無効または期限切れです。新しいトークンを生成してください。",
    connectErrorSession: "セッションが切れました。トークンは削除されました。再ログインしてください。",
    connectErrorTokenExpired: "保存されたトークンが期限切れまたは失効しました。新しいものを生成してください。",

    errorTitle: "問題が発生しました",
    errorRetry: "再試行",

    errorUnfollowInaccessible: "{login} のフォローを解除できませんでした：プロフィールにアクセスできません。",
    errorRateLimit: "リクエストが多すぎます。しばらく待ってから再試行してください。",
    errorGitHubTemp: "GitHubの一時的なエラー。再試行してください。",
    errorUnfollow: "{login} のフォロー解除中にエラー: {message}",
    errorFollow: "{login} のフォロー中にエラー: {message}",

    importErrorFormat: "無効なファイル形式です。",
    importErrorGeneric: "インポート中にエラー: {message}",

    http400: "何かが正しく送信されませんでした。再試行してください。",
    http401: "セッションの期限が切れました。再ログインしてください。",
    http403: "GitHubがこのリクエストをブロックしました。レート制限に達したか、権限がない可能性があります。",
    http404: "GitHub上でこのリソースが見つかりませんでした。",
    http422: "GitHubがこの操作を拒否しました。プロフィールが公開されているか、制限がないか確認してください。",
    http429: "短時間にリクエストが多すぎます。数分待ってから再試行してください。",
    http500: "GitHubのサーバーで問題が発生しました。これは一時的なものです — しばらくしてから再試行してください。<br>{statusLink}",
    http502: "GitHubが一時的にダウンしています。しばらくしてから再試行してください。<br>{statusLink}",
    http503: "GitHubが一時的に利用できません。メンテナンスの可能性があります。数分後に再試行してください。<br>{statusLink}",
    http504: "GitHubへの接続がタイムアウトしました。インターネット接続を確認して再試行してください。<br>{statusLink}",
    httpUnknown: "予期しないGitHubエラーが発生しました (HTTP {status})。再試行してください。",
    httpStatusLink: "GitHubのステータスを確認",

    bgNetworkError: "ネットワークエラー",

    apiTimeout: "リクエストがタイムアウトしました。接続を確認してください。",
    apiNetworkError: "インターネット接続がありません。ネットワークを確認してください。",
  },

  ru: {
    tokenStep1Title: "Создайте токен",
    tokenStep1Desc:
      'Области <code>read:user</code> + <code>user:follow</code> предварительно выбраны. Прокрутите вниз страницы и нажмите <strong>Generate token</strong>.',
    btnCreateToken: "Открыть страницу токенов GitHub",
    tokenStep2Title: "Скопируйте токен",
    tokenStep2Desc: "Начинается с <code>ghp_</code>",
    tokenStep3Title: "Вставьте и подключитесь",
    tokenStep3Desc: 'В поле ниже нажмите «Подключиться»',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Подключиться",
    reportProblem: "Сообщить о проблеме",

    headerFollowers: "подписчики",

    navResults: "Списки",
    navHistory: "История",
    navWhitelist: "Белый список",

    tabAll: "Не взаимны",
    tabNotFollowingBack: "Не подписан",
    tabMutual: "Взаимные",

    searchPlaceholder: "Фильтр по имени пользователя... (/)",

    listLabelUnfollowers: "Не подписаны в ответ",
    listLabelMutual: "Взаимные подписчики",
    listLabelNotFollowingBack: "Кто на вас подписан",

    btnCancel: "Отмена",
    btnFollowAll: "Подписаться на всех",
    btnUnfollowAll: "Отписаться от всех",
    btnShow: "Показать",
    btnHide: "Скрыть",

    emptyFiltered: "Нет результатов для этого фильтра.",
    allFollowingBackTitle: "<strong>Всё в порядке!</strong>",
    allFollowingBackAll: "<strong>Всё в порядке!</strong> Все, на кого вы подписаны, подписаны на вас в ответ.",
    allFollowingBackMutual: "<strong>Нет взаимных подписчиков.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Вы уже подписаны на всех, кто подписан на вас.</strong>",

    unfollowableBanner: "{count} аккаунтов не могут быть подписаны автоматически.",

    historyTitle: "История",
    historyHint: "30 дней",
    btnClearHistory: "Очистить",
    historyEmpty: "События ещё не записаны.",
    historyTimeNow: "только что",

    whitelistTitle: "Белый список",
    whitelistHint: "Игнорируемые",
    whitelistEmpty: "Нет пользователей в белом списке.",

    profileFollowers: "подписчики",
    profileFollowing: "подписки",
    profileRepos: "репозитории",
    profilePopularRepos: "Популярные репозитории",
    profileNoRepos: "Нет публичных репозиториев.",
    profileLoading: "Загрузка...",
    profileClose: "Закрыть (Esc)",
    profileWhitelistAdd: "Всегда игнорировать",
    profileWhitelistRemove: "Удалить из белого списка",

    modalCancel: "Отмена",
    modalTitleUnfollow: "Отписаться?",
    modalTitleFollow: "Подписаться в ответ?",
    modalTitleImport: "Импортировать данные?",
    modalTextUnfollow:
      "Вы собираетесь отписаться от <strong>{count}</strong> пользователя(ей), которые не подписаны на вас в ответ.",
    modalTextFollow:
      "Вы собираетесь подписаться на <strong>{count}</strong> пользователя(ей), которые подписаны на вас.",
    modalTextResumeFollow:
      "Вы собираетесь подписаться на <strong>{count}</strong> пользователя(ей), которые подписаны на вас.",
    modalTextResumeUnfollow:
      "Вы собираетесь отписаться от <strong>{count}</strong> пользователя(ей), которые не подписаны на вас в ответ.",
    modalTextImport:
      "Импортировать <strong>{whitelistCount}</strong> пользователя(ей) в белый список и <strong>{historyCount}</strong> событие(й) истории.<br><br>Текущие данные будут заменены.",
    modalConfirmUnfollow: "Да, отписаться",
    modalConfirmFollow: "Да, подписаться",
    modalConfirmImport: "Да, импортировать",

    menuTheme: "Сменить тему",
    menuRefresh: "Обновить данные",
    menuExport: "Экспортировать данные",
    menuImport: "Импортировать данные",
    menuDev: "Симулировать ошибки",
    menuReport: "Сообщить о проблеме",
    menuLogout: "Отключиться",
    menuLanguage: "Язык: {lang}",
    langPickerTitle: "Выбрать язык",
    langPickerSearchPlaceholder: "Поиск языка...",

    shortcutsHint: "1·2·3 вкладки  |  / поиск  |  H история  |  W белый список  |  T тема  |  Esc закрыть",

    devTitle: "Симуляция ошибок",
    devDescription: "Выберите сценарий для симуляции поведения API.",
    devClear: "Очистить симуляцию",
    devHint: "Настройки сохраняются в локальном хранилище.",
    devClose: "Закрыть",

    badgeInaccessible: "Недоступен",
    badgeMutual: "Взаимный",
    badgeNew: "Новый",
    badgeWhitelist: "Игнорируется",
    badgeFollowed: "Подписался на вас",
    badgeNotFollowingBack: "Не подписан на вас",
    badgeUnfollowed: "Отписался",

    actionFollow: "Подписаться",
    actionUnfollow: "Отписаться",
    actionRemove: "Удалить",
    actionViewProfile: "Посмотреть профиль",
    actionWhitelistAdd: "Всегда игнорировать",
    actionWhitelistRemove: "Удалить из белого списка",

    loadingProfile: "Получение вашего профиля...",
    loadingFollowing: "Загрузка списка подписок...",
    loadingFollowers: "Загрузка списка подписчиков...",
    loadingCalculating: "Расчёт...",

    processingLabel: "Обработка",
    resumingLabel: "Возобновление",
    cancelledLabel: "Отменено ({done}/{total})",
    cancellingLabel: "Отмена...",

    connectChecking: "Проверка...",
    connectErrorNoToken: "Вставьте ваш Personal Access Token выше.",
    connectErrorExpired: "Недействительный или истёкший токен. Создайте новый.",
    connectErrorSession: "Сессия истекла. Ваш токен удалён. Войдите снова.",
    connectErrorTokenExpired: "Сохранённый токен истёк или был отозван. Создайте новый.",

    errorTitle: "Что-то пошло не так",
    errorRetry: "Повторить попытку",

    errorUnfollowInaccessible: "Не удалось отписаться от {login}: профиль недоступен.",
    errorRateLimit: "Слишком много запросов. Подождите и повторите попытку.",
    errorGitHubTemp: "Временная ошибка GitHub. Повторите попытку.",
    errorUnfollow: "Ошибка при отписке от {login}: {message}",
    errorFollow: "Ошибка при подписке на {login}: {message}",

    importErrorFormat: "Неверный формат файла.",
    importErrorGeneric: "Ошибка при импорте: {message}",

    http400: "Что-то было отправлено неправильно. Повторите попытку.",
    http401: "Ваша сессия истекла. Пожалуйста, войдите снова.",
    http403: "GitHub заблокировал этот запрос. Возможно, вы превысили лимит или у вас нет разрешения.",
    http404: "Не удалось найти этот ресурс на GitHub.",
    http422: "GitHub отклонил эту операцию. Проверьте, является ли профиль публичным или есть ли ограничения.",
    http429: "Слишком много запросов за короткое время. Подождите несколько минут и повторите попытку.",
    http500: "Что-то пошло не так на серверах GitHub. Это временно — повторите попытку через несколько мгновений.<br>{statusLink}",
    http502: "GitHub временно не работает. Повторите попытку через несколько мгновений.<br>{statusLink}",
    http503: "GitHub временно недоступен, возможно, ведутся технические работы. Повторите попытку через несколько минут.<br>{statusLink}",
    http504: "Соединение с GitHub прервано по тайм-ауту. Проверьте интернет и повторите попытку.<br>{statusLink}",
    httpUnknown: "Произошла неожиданная ошибка GitHub (HTTP {status}). Повторите попытку.",
    httpStatusLink: "Проверить статус GitHub",

    bgNetworkError: "Сетевая ошибка",

    apiTimeout: "Время ожидания запроса истекло. Проверьте соединение.",
    apiNetworkError: "Нет подключения к интернету. Проверьте сеть.",
  },

  ko: {
    tokenStep1Title: "토큰 생성",
    tokenStep1Desc:
      '범위 <code>read:user</code> + <code>user:follow</code>가 미리 선택되어 있습니다. 페이지 하단으로 스크롤하여 <strong>Generate token</strong>을 클릭하세요.',
    btnCreateToken: "GitHub 토큰 페이지 열기",
    tokenStep2Title: "토큰 복사",
    tokenStep2Desc: "<code>ghp_</code>로 시작합니다",
    tokenStep3Title: "붙여넣고 연결",
    tokenStep3Desc: '아래 필드에서 "연결"을 클릭하세요',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "연결",
    reportProblem: "문제 신고",

    headerFollowers: "팔로워",

    navResults: "목록",
    navHistory: "기록",
    navWhitelist: "화이트리스트",

    tabAll: "맞팔하지 않음",
    tabNotFollowingBack: "팔로우 안 함",
    tabMutual: "맞팔",

    searchPlaceholder: "사용자 이름으로 필터... (/)",

    listLabelUnfollowers: "나를 맞팔로우하지 않는 사용자",
    listLabelMutual: "맞팔로워",
    listLabelNotFollowingBack: "나를 팔로우하는 사용자",

    btnCancel: "취소",
    btnFollowAll: "모두 팔로우",
    btnUnfollowAll: "모두 언팔로우",
    btnShow: "표시",
    btnHide: "숨기기",

    emptyFiltered: "이 필터에 대한 결과가 없습니다.",
    allFollowingBackTitle: "<strong>모두 정상입니다!</strong>",
    allFollowingBackAll: "<strong>모두 정상입니다!</strong> 내가 팔로우하는 모든 사람이 맞팔로우하고 있습니다.",
    allFollowingBackMutual: "<strong>맞팔로워가 없습니다.</strong>",
    allFollowingBackNotFollowingBack: "<strong>나를 팔로우하는 모든 사람을 이미 맞팔로우하고 있습니다.</strong>",

    unfollowableBanner: "{count}개 계정을 자동으로 팔로우할 수 없습니다.",

    historyTitle: "기록",
    historyHint: "30일",
    btnClearHistory: "지우기",
    historyEmpty: "아직 기록된 이벤트가 없습니다.",
    historyTimeNow: "방금",

    whitelistTitle: "화이트리스트",
    whitelistHint: "무시됨",
    whitelistEmpty: "화이트리스트에 사용자가 없습니다.",

    profileFollowers: "팔로워",
    profileFollowing: "팔로우",
    profileRepos: "저장소",
    profilePopularRepos: "인기 저장소",
    profileNoRepos: "공개 저장소가 없습니다.",
    profileLoading: "로딩 중...",
    profileClose: "닫기 (Esc)",
    profileWhitelistAdd: "항상 무시",
    profileWhitelistRemove: "화이트리스트에서 제거",

    modalCancel: "취소",
    modalTitleUnfollow: "언팔로우하시겠습니까?",
    modalTitleFollow: "맞팔로우하시겠습니까?",
    modalTitleImport: "데이터를 가져오시겠습니까?",
    modalTextUnfollow:
      "<strong>{count}</strong>명의 맞팔로우하지 않는 사용자를 언팔로우하려고 합니다.",
    modalTextFollow:
      "<strong>{count}</strong>명의 나를 팔로우하는 사용자를 팔로우하려고 합니다.",
    modalTextResumeFollow:
      "<strong>{count}</strong>명의 나를 팔로우하는 사용자를 팔로우하려고 합니다.",
    modalTextResumeUnfollow:
      "<strong>{count}</strong>명의 맞팔로우하지 않는 사용자를 언팔로우하려고 합니다.",
    modalTextImport:
      "화이트리스트에 <strong>{whitelistCount}</strong>명의 사용자와 <strong>{historyCount}</strong>개의 기록 이벤트를 가져옵니다.<br><br>현재 데이터가 대체됩니다.",
    modalConfirmUnfollow: "예, 언팔로우",
    modalConfirmFollow: "예, 팔로우",
    modalConfirmImport: "예, 가져오기",

    menuTheme: "테마 전환",
    menuRefresh: "데이터 새로고침",
    menuExport: "데이터 내보내기",
    menuImport: "데이터 가져오기",
    menuDev: "오류 시뮬레이션",
    menuReport: "문제 신고",
    menuLogout: "연결 끊기",
    menuLanguage: "언어: {lang}",
    langPickerTitle: "언어 선택",
    langPickerSearchPlaceholder: "언어 검색...",

    shortcutsHint: "1·2·3 탭  |  / 검색  |  H 기록  |  W 화이트리스트  |  T 테마  |  Esc 닫기",

    devTitle: "오류 시뮬레이션",
    devDescription: "API 동작을 시뮬레이션할 시나리오를 선택하세요.",
    devClear: "시뮬레이션 지우기",
    devHint: "설정은 로컬 저장소에 유지됩니다.",
    devClose: "닫기",

    badgeInaccessible: "접근 불가",
    badgeMutual: "맞팔",
    badgeNew: "새로운",
    badgeWhitelist: "무시됨",
    badgeFollowed: "나를 팔로우함",
    badgeNotFollowingBack: "나를 팔로우하지 않음",
    badgeUnfollowed: "언팔로우함",

    actionFollow: "팔로우",
    actionUnfollow: "언팔로우",
    actionRemove: "제거",
    actionViewProfile: "프로필 보기",
    actionWhitelistAdd: "항상 무시",
    actionWhitelistRemove: "화이트리스트에서 제거",

    loadingProfile: "프로필 가져오는 중...",
    loadingFollowing: "팔로우 목록 로딩 중...",
    loadingFollowers: "팔로워 목록 로딩 중...",
    loadingCalculating: "계산 중...",

    processingLabel: "처리 중",
    resumingLabel: "재개 중",
    cancelledLabel: "취소됨 ({done}/{total})",
    cancellingLabel: "취소 중...",

    connectChecking: "확인 중...",
    connectErrorNoToken: "위에 Personal Access Token을 붙여넣으세요.",
    connectErrorExpired: "토큰이 유효하지 않거나 만료되었습니다. 새 토큰을 생성하세요.",
    connectErrorSession: "세션이 만료되었습니다. 토큰이 제거되었습니다. 다시 로그인하세요.",
    connectErrorTokenExpired: "저장된 토큰이 만료되었거나 취소되었습니다. 새로 생성하세요.",

    errorTitle: "문제가 발생했습니다",
    errorRetry: "다시 시도",

    errorUnfollowInaccessible: "{login}을(를) 언팔로우할 수 없습니다: 프로필에 접근할 수 없습니다.",
    errorRateLimit: "요청이 너무 많습니다. 잠시 기다린 후 다시 시도하세요.",
    errorGitHubTemp: "GitHub 임시 오류입니다. 다시 시도하세요.",
    errorUnfollow: "{login} 언팔로우 중 오류: {message}",
    errorFollow: "{login} 팔로우 중 오류: {message}",

    importErrorFormat: "잘못된 파일 형식입니다.",
    importErrorGeneric: "가져오기 중 오류: {message}",

    http400: "잘못된 형식으로 전송되었습니다. 다시 시도하세요.",
    http401: "세션이 만료되었습니다. 다시 로그인하세요.",
    http403: "GitHub가 이 요청을 차단했습니다. 속도 제한에 도달했거나 권한이 없을 수 있습니다.",
    http404: "GitHub에서 이 리소스를 찾을 수 없습니다.",
    http422: "GitHub가 이 작업을 거부했습니다. 프로필이 공개인지 또는 제한 사항이 있는지 확인하세요.",
    http429: "짧은 시간에 너무 많은 요청을 보냈습니다. 몇 분 기다린 후 다시 시도하세요.",
    http500: "GitHub 서버에 문제가 발생했습니다. 일시적인 현상입니다 — 잠시 후 다시 시도하세요.<br>{statusLink}",
    http502: "GitHub가 일시적으로 다운되었습니다. 잠시 후 다시 시도하세요.<br>{statusLink}",
    http503: "GitHub를 일시적으로 사용할 수 없습니다. 점검 중일 수 있습니다. 몇 분 후 다시 시도하세요.<br>{statusLink}",
    http504: "GitHub 연결 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도하세요.<br>{statusLink}",
    httpUnknown: "예상치 못한 GitHub 오류가 발생했습니다 (HTTP {status}). 다시 시도하세요.",
    httpStatusLink: "GitHub 상태 확인",

    bgNetworkError: "네트워크 오류",

    apiTimeout: "요청 시간이 초과되었습니다. 연결을 확인하세요.",
    apiNetworkError: "인터넷 연결이 없습니다. 네트워크를 확인하세요.",
  },

  it: {
    tokenStep1Title: "Crea il tuo token",
    tokenStep1Desc:
      'Gli ambiti <code>read:user</code> + <code>user:follow</code> sono preselezionati. Scorri fino in fondo alla pagina e clicca su <strong>Generate token</strong>.',
    btnCreateToken: "Apri la pagina dei token di GitHub",
    tokenStep2Title: "Copia il token",
    tokenStep2Desc: "Inizia con <code>ghp_</code>",
    tokenStep3Title: "Incolla e connetti",
    tokenStep3Desc: 'Nel campo sottostante, clicca su "Connetti"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Connetti",
    reportProblem: "Segnala problema",

    headerFollowers: "follower",

    navResults: "Elenchi",
    navHistory: "Cronologia",
    navWhitelist: "Whitelist",

    tabAll: "Non ricambiano",
    tabNotFollowingBack: "Non seguo",
    tabMutual: "Reciproci",

    searchPlaceholder: "Filtra per nome utente... (/)",

    listLabelUnfollowers: "Non ti seguono",
    listLabelMutual: "Follower reciproci",
    listLabelNotFollowingBack: "Chi ti segue",

    btnCancel: "Annulla",
    btnFollowAll: "Segui tutti",
    btnUnfollowAll: "Smetti di seguire tutti",
    btnShow: "Mostra",
    btnHide: "Nascondi",

    emptyFiltered: "Nessun risultato per questo filtro.",
    allFollowingBackTitle: "<strong>Tutto a posto!</strong>",
    allFollowingBackAll: "<strong>Tutto a posto!</strong> Tutti quelli che segui ti seguono.",
    allFollowingBackMutual: "<strong>Nessun follower reciproco.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Ricambi già tutti quelli che ti seguono.</strong>",

    unfollowableBanner: "{count} account non possono essere seguiti automaticamente.",

    historyTitle: "Cronologia",
    historyHint: "30 giorni",
    btnClearHistory: "Cancella",
    historyEmpty: "Nessun evento registrato ancora.",
    historyTimeNow: "proprio ora",

    whitelistTitle: "Whitelist",
    whitelistHint: "Ignorati",
    whitelistEmpty: "Nessun utente nella whitelist.",

    profileFollowers: "follower",
    profileFollowing: "seguiti",
    profileRepos: "repo",
    profilePopularRepos: "Repository popolari",
    profileNoRepos: "Nessun repository pubblico.",
    profileLoading: "Caricamento...",
    profileClose: "Chiudi (Esc)",
    profileWhitelistAdd: "Ignora sempre",
    profileWhitelistRemove: "Rimuovi dalla whitelist",

    modalCancel: "Annulla",
    modalTitleUnfollow: "Smetti di seguire?",
    modalTitleFollow: "Segui?",
    modalTitleImport: "Importare dati?",
    modalTextUnfollow:
      "Stai per smettere di seguire <strong>{count}</strong> utente(i) che non ti seguono.",
    modalTextFollow:
      "Stai per seguire <strong>{count}</strong> utente(i) che ti seguono.",
    modalTextResumeFollow:
      "Stai per seguire <strong>{count}</strong> utente(i) che ti seguono.",
    modalTextResumeUnfollow:
      "Stai per smettere di seguire <strong>{count}</strong> utente(i) che non ti seguono.",
    modalTextImport:
      "Importa <strong>{whitelistCount}</strong> utente(i) nella whitelist e <strong>{historyCount}</strong> evento(i) dalla cronologia.<br><br>I dati attuali verranno sostituiti.",
    modalConfirmUnfollow: "Sì, smetti di seguire",
    modalConfirmFollow: "Sì, segui",
    modalConfirmImport: "Sì, importa",

    menuTheme: "Cambia tema",
    menuRefresh: "Aggiorna dati",
    menuExport: "Esporta dati",
    menuImport: "Importa dati",
    menuDev: "Simula errori",
    menuReport: "Segnala problema",
    menuLogout: "Disconnetti",
    menuLanguage: "Lingua: {lang}",
    langPickerTitle: "Seleziona lingua",
    langPickerSearchPlaceholder: "Cerca lingua...",

    shortcutsHint: "1·2·3 schede  |  / cerca  |  H cronologia  |  W whitelist  |  T tema  |  Esc chiudi",

    devTitle: "Simulazione errori",
    devDescription: "Seleziona uno scenario per simulare il comportamento dell'API.",
    devClear: "Cancella simulazione",
    devHint: "Le impostazioni persistono nell'archivio locale.",
    devClose: "Chiudi",

    badgeInaccessible: "Inaccessibile",
    badgeMutual: "Reciproco",
    badgeNew: "Nuovo",
    badgeWhitelist: "Ignorato",
    badgeFollowed: "Ti ha seguito",
    badgeNotFollowingBack: "Non ti segue",
    badgeUnfollowed: "Ha smesso di seguirti",

    actionFollow: "Segui",
    actionUnfollow: "Smetti di seguire",
    actionRemove: "Rimuovi",
    actionViewProfile: "Vedi profilo",
    actionWhitelistAdd: "Ignora sempre",
    actionWhitelistRemove: "Rimuovi dalla whitelist",

    loadingProfile: "Recupero del tuo profilo...",
    loadingFollowing: "Caricamento elenco seguiti...",
    loadingFollowers: "Caricamento elenco follower...",
    loadingCalculating: "Calcolo...",

    processingLabel: "Elaborazione",
    resumingLabel: "Riprendi",
    cancelledLabel: "Annullato ({done}/{total})",
    cancellingLabel: "Annullamento...",

    connectChecking: "Verifica...",
    connectErrorNoToken: "Incolla il tuo Personal Access Token qui sopra.",
    connectErrorExpired: "Token non valido o scaduto. Generane uno nuovo.",
    connectErrorSession: "Sessione scaduta. Il tuo token è stato rimosso. Effettua nuovamente l'accesso.",
    connectErrorTokenExpired: "Il token salvato è scaduto o è stato revocato. Generane uno nuovo.",

    errorTitle: "Qualcosa è andato storto",
    errorRetry: "Riprova",

    errorUnfollowInaccessible: "Impossibile smettere di seguire {login}: profilo inaccessibile.",
    errorRateLimit: "Troppe richieste. Attendi e riprova.",
    errorGitHubTemp: "Errore temporaneo di GitHub. Riprova.",
    errorUnfollow: "Errore smettendo di seguire {login}: {message}",
    errorFollow: "Errore seguendo {login}: {message}",

    importErrorFormat: "Formato file non valido.",
    importErrorGeneric: "Errore durante l'importazione: {message}",

    http400: "Qualcosa è stato inviato in modo errato. Riprova.",
    http401: "La sessione è scaduta. Effettua nuovamente l'accesso.",
    http403: "GitHub ha bloccato questa richiesta. Potresti aver raggiunto il limite di utilizzo o non avere i permessi.",
    http404: "Impossibile trovare questa risorsa su GitHub.",
    http422: "GitHub ha rifiutato questa operazione. Verifica se il profilo è pubblico o se ci sono restrizioni.",
    http429: "Troppe richieste in poco tempo. Attendi qualche minuto e riprova.",
    http500: "Qualcosa è andato storto sui server di GitHub. È temporaneo — riprova tra qualche istante.<br>{statusLink}",
    http502: "GitHub è temporaneamente fuori servizio. Riprova tra qualche istante.<br>{statusLink}",
    http503: "GitHub è temporaneamente non disponibile, probabilmente in manutenzione. Riprova tra qualche minuto.<br>{statusLink}",
    http504: "La connessione a GitHub ha impiegato troppo tempo ed è stata interrotta. Controlla la connessione e riprova.<br>{statusLink}",
    httpUnknown: "Si è verificato un errore imprevisto di GitHub (HTTP {status}). Riprova.",
    httpStatusLink: "Controlla lo stato di GitHub",

    bgNetworkError: "Errore di rete",

    apiTimeout: "La richiesta ha superato il limite di tempo. Controlla la connessione.",
    apiNetworkError: "Nessuna connessione Internet. Controlla la rete.",
  },

  tr: {
    tokenStep1Title: "Token oluşturun",
    tokenStep1Desc:
      '<code>read:user</code> + <code>user:follow</code> kapsamları önceden seçilidir. Sayfanın en altına kaydırın ve <strong>Generate token</strong> düğmesine tıklayın.',
    btnCreateToken: "GitHub token sayfasını aç",
    tokenStep2Title: "Tokenı kopyalayın",
    tokenStep2Desc: "<code>ghp_</code> ile başlar",
    tokenStep3Title: "Yapıştır ve bağlan",
    tokenStep3Desc: 'Aşağıdaki alana yapıştırın ve "Bağlan"a tıklayın',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Bağlan",
    reportProblem: "Sorun bildir",

    headerFollowers: "takipçi",

    navResults: "Listeler",
    navHistory: "Geçmiş",
    navWhitelist: "Beyaz liste",

    tabAll: "Takip etmeyenler",
    tabNotFollowingBack: "Takip etmiyorum",
    tabMutual: "Karşılıklı",

    searchPlaceholder: "Kullanıcı adına göre filtrele... (/)",

    listLabelUnfollowers: "Seni geri takip etmiyor",
    listLabelMutual: "Karşılıklı takipçiler",
    listLabelNotFollowingBack: "Seni takip edenler",

    btnCancel: "İptal",
    btnFollowAll: "Hepsini takip et",
    btnUnfollowAll: "Hepsini takipten çık",
    btnShow: "Göster",
    btnHide: "Gizle",

    emptyFiltered: "Bu filtre için sonuç yok.",
    allFollowingBackTitle: "<strong>Her şey yolunda!</strong>",
    allFollowingBackAll: "<strong>Her şey yolunda!</strong> Takip ettiğin herkes seni geri takip ediyor.",
    allFollowingBackMutual: "<strong>Karşılıklı takipçi yok.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Seni takip eden herkesi zaten geri takip ediyorsun.</strong>",

    unfollowableBanner: "{count} hesap otomatik olarak takip edilemiyor.",

    historyTitle: "Geçmiş",
    historyHint: "30 gün",
    btnClearHistory: "Temizle",
    historyEmpty: "Henüz kaydedilmiş bir olay yok.",
    historyTimeNow: "şimdi",

    whitelistTitle: "Beyaz liste",
    whitelistHint: "Yok sayılanlar",
    whitelistEmpty: "Beyaz listede kullanıcı yok.",

    profileFollowers: "takipçi",
    profileFollowing: "takip ediyor",
    profileRepos: "depo",
    profilePopularRepos: "Popüler depolar",
    profileNoRepos: "Herkese açık depo yok.",
    profileLoading: "Yükleniyor...",
    profileClose: "Kapat (Esc)",
    profileWhitelistAdd: "Her zaman yok say",
    profileWhitelistRemove: "Beyaz listeden çıkar",

    modalCancel: "İptal",
    modalTitleUnfollow: "Takipten çık?",
    modalTitleFollow: "Geri takip et?",
    modalTitleImport: "Veri içe aktarılsın mı?",
    modalTextUnfollow:
      "<strong>{count}</strong> seni geri takip etmeyen kullanıcının takibini bırakmak üzeresin.",
    modalTextFollow:
      "<strong>{count}</strong> seni takip eden kullanıcıyı takip etmek üzeresin.",
    modalTextResumeFollow:
      "<strong>{count}</strong> seni takip eden kullanıcıyı takip etmek üzeresin.",
    modalTextResumeUnfollow:
      "<strong>{count}</strong> seni geri takip etmeyen kullanıcının takibini bırakmak üzeresin.",
    modalTextImport:
      "Beyaz listede <strong>{whitelistCount}</strong> kullanıcı ve geçmişte <strong>{historyCount}</strong> olay içe aktarılsın.<br><br>Mevcut veriler değiştirilecek.",
    modalConfirmUnfollow: "Evet, takipten çık",
    modalConfirmFollow: "Evet, takip et",
    modalConfirmImport: "Evet, içe aktar",

    menuTheme: "Temayı değiştir",
    menuRefresh: "Verileri yenile",
    menuExport: "Verileri dışa aktar",
    menuImport: "Verileri içe aktar",
    menuDev: "Hata simülasyonu",
    menuReport: "Sorun bildir",
    menuLogout: "Bağlantıyı kes",
    menuLanguage: "Dil: {lang}",
    langPickerTitle: "Dil seç",
    langPickerSearchPlaceholder: "Dil ara...",

    shortcutsHint: "1·2·3 sekmeler  |  / ara  |  H geçmiş  |  W beyaz liste  |  T tema  |  Esc kapat",

    devTitle: "Hata Simülasyonu",
    devDescription: "API davranışını simüle etmek için bir senaryo seçin.",
    devClear: "Simülasyonu temizle",
    devHint: "Ayarlar yerel depolamada kalıcıdır.",
    devClose: "Kapat",

    badgeInaccessible: "Erişilemez",
    badgeMutual: "Karşılıklı",
    badgeNew: "Yeni",
    badgeWhitelist: "Yok sayıldı",
    badgeFollowed: "Seni takip etti",
    badgeNotFollowingBack: "Seni takip etmiyor",
    badgeUnfollowed: "Takipten çıktı",

    actionFollow: "Takip et",
    actionUnfollow: "Takipten çık",
    actionRemove: "Kaldır",
    actionViewProfile: "Profili görüntüle",
    actionWhitelistAdd: "Her zaman yok say",
    actionWhitelistRemove: "Beyaz listeden çıkar",

    loadingProfile: "Profilin alınıyor...",
    loadingFollowing: "Takip listesi yükleniyor...",
    loadingFollowers: "Takipçi listesi yükleniyor...",
    loadingCalculating: "Hesaplanıyor...",

    processingLabel: "İşleniyor",
    resumingLabel: "Sürdürülüyor",
    cancelledLabel: "İptal edildi ({done}/{total})",
    cancellingLabel: "İptal ediliyor...",

    connectChecking: "Doğrulanıyor...",
    connectErrorNoToken: "Personal Access Token'ınızı yukarıya yapıştırın.",
    connectErrorExpired: "Token geçersiz veya süresi dolmuş. Yeni bir token oluşturun.",
    connectErrorSession: "Oturum süresi doldu. Tokenınız kaldırıldı. Tekrar giriş yapın.",
    connectErrorTokenExpired: "Kaydedilen token süresi doldu veya iptal edildi. Yeni bir tane oluşturun.",

    errorTitle: "Bir şeyler yanlış gitti",
    errorRetry: "Tekrar dene",

    errorUnfollowInaccessible: "{login} takipten çıkılamadı: profile erişilemiyor.",
    errorRateLimit: "Çok fazla istek. Bekleyin ve tekrar deneyin.",
    errorGitHubTemp: "Geçici GitHub hatası. Tekrar deneyin.",
    errorUnfollow: "{login} takipten çıkarken hata: {message}",
    errorFollow: "{login} takip edilirken hata: {message}",

    importErrorFormat: "Geçersiz dosya biçimi.",
    importErrorGeneric: "İçe aktarılırken hata: {message}",

    http400: "Bir şey yanlış gönderildi. Lütfen tekrar deneyin.",
    http401: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
    http403: "GitHub bu isteği engelledi. Kota sınırına ulaşmış veya izniniz olmayabilir.",
    http404: "Bu kaynak GitHub'da bulunamadı.",
    http422: "GitHub bu işlemi reddetti. Profilin herkese açık olup olmadığını veya kısıtlama olup olmadığını kontrol edin.",
    http429: "Kısa sürede çok fazla istek gönderdiniz. Birkaç dakika bekleyin ve tekrar deneyin.",
    http500: "GitHub sunucularında bir şeyler yanlış gitti. Bu geçicidir — birkaç saniye içinde tekrar deneyin.<br>{statusLink}",
    http502: "GitHub geçici olarak kapalı. Lütfen birkaç saniye içinde tekrar deneyin.<br>{statusLink}",
    http503: "GitHub geçici olarak kullanılamıyor, muhtemelen bakımda. Birkaç dakika içinde tekrar deneyin.<br>{statusLink}",
    http504: "GitHub ile bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.<br>{statusLink}",
    httpUnknown: "Beklenmeyen bir GitHub hatası oluştu (HTTP {status}). Lütfen tekrar deneyin.",
    httpStatusLink: "GitHub durumunu kontrol et",

    bgNetworkError: "Ağ hatası",

    apiTimeout: "İstek zaman aşımına uğradı. Bağlantınızı kontrol edin.",
    apiNetworkError: "İnternet bağlantısı yok. Ağınızı kontrol edin.",
  },

  vi: {
    tokenStep1Title: "Tạo token",
    tokenStep1Desc:
      'Các phạm vi <code>read:user</code> + <code>user:follow</code> đã được chọn sẵn. Cuộn xuống cuối trang và nhấp vào <strong>Generate token</strong>.',
    btnCreateToken: "Mở trang token GitHub",
    tokenStep2Title: "Sao chép token",
    tokenStep2Desc: "Bắt đầu bằng <code>ghp_</code>",
    tokenStep3Title: "Dán và kết nối",
    tokenStep3Desc: 'Trong ô bên dưới, nhấp vào "Kết nối"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Kết nối",
    reportProblem: "Báo cáo sự cố",

    headerFollowers: "người theo dõi",

    navResults: "Danh sách",
    navHistory: "Lịch sử",
    navWhitelist: "Danh sách trắng",

    tabAll: "Không theo dõi lại",
    tabNotFollowingBack: "Không theo dõi",
    tabMutual: "Tương hỗ",

    searchPlaceholder: "Lọc theo tên người dùng... (/)",

    listLabelUnfollowers: "Không theo dõi lại bạn",
    listLabelMutual: "Người theo dõi tương hỗ",
    listLabelNotFollowingBack: "Người theo dõi bạn",

    btnCancel: "Hủy",
    btnFollowAll: "Theo dõi tất cả",
    btnUnfollowAll: "Bỏ theo dõi tất cả",
    btnShow: "Hiển thị",
    btnHide: "Ẩn",

    emptyFiltered: "Không có kết quả cho bộ lọc này.",
    allFollowingBackTitle: "<strong>Mọi thứ ổn!</strong>",
    allFollowingBackAll: "<strong>Mọi thứ ổn!</strong> Tất cả những người bạn theo dõi đều theo dõi lại bạn.",
    allFollowingBackMutual: "<strong>Không có người theo dõi tương hỗ.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Bạn đã theo dõi lại tất cả những người theo dõi bạn.</strong>",

    unfollowableBanner: "{count} tài khoản không thể tự động theo dõi.",

    historyTitle: "Lịch sử",
    historyHint: "30 ngày",
    btnClearHistory: "Xóa",
    historyEmpty: "Chưa có sự kiện nào được ghi lại.",
    historyTimeNow: "vừa xong",

    whitelistTitle: "Danh sách trắng",
    whitelistHint: "Đã bỏ qua",
    whitelistEmpty: "Không có người dùng nào trong danh sách trắng.",

    profileFollowers: "người theo dõi",
    profileFollowing: "đang theo dõi",
    profileRepos: "kho",
    profilePopularRepos: "Kho phổ biến",
    profileNoRepos: "Không có kho công khai.",
    profileLoading: "Đang tải...",
    profileClose: "Đóng (Esc)",
    profileWhitelistAdd: "Luôn bỏ qua",
    profileWhitelistRemove: "Xóa khỏi danh sách trắng",

    modalCancel: "Hủy",
    modalTitleUnfollow: "Bỏ theo dõi?",
    modalTitleFollow: "Theo dõi lại?",
    modalTitleImport: "Nhập dữ liệu?",
    modalTextUnfollow:
      "Bạn sắp bỏ theo dõi <strong>{count}</strong> người dùng không theo dõi lại bạn.",
    modalTextFollow:
      "Bạn sắp theo dõi <strong>{count}</strong> người dùng đang theo dõi bạn.",
    modalTextResumeFollow:
      "Bạn sắp theo dõi <strong>{count}</strong> người dùng đang theo dõi bạn.",
    modalTextResumeUnfollow:
      "Bạn sắp bỏ theo dõi <strong>{count}</strong> người dùng không theo dõi lại bạn.",
    modalTextImport:
      "Nhập <strong>{whitelistCount}</strong> người dùng vào danh sách trắng và <strong>{historyCount}</strong> sự kiện lịch sử.<br><br>Dữ liệu hiện tại sẽ được thay thế.",
    modalConfirmUnfollow: "Có, bỏ theo dõi",
    modalConfirmFollow: "Có, theo dõi",
    modalConfirmImport: "Có, nhập",

    menuTheme: "Chuyển đổi giao diện",
    menuRefresh: "Làm mới dữ liệu",
    menuExport: "Xuất dữ liệu",
    menuImport: "Nhập dữ liệu",
    menuDev: "Mô phỏng lỗi",
    menuReport: "Báo cáo sự cố",
    menuLogout: "Ngắt kết nối",
    menuLanguage: "Ngôn ngữ: {lang}",
    langPickerTitle: "Chọn ngôn ngữ",
    langPickerSearchPlaceholder: "Tìm ngôn ngữ...",

    shortcutsHint: "1·2·3 tab  |  / tìm kiếm  |  H lịch sử  |  W danh sách trắng  |  T giao diện  |  Esc đóng",

    devTitle: "Mô phỏng lỗi",
    devDescription: "Chọn kịch bản để mô phỏng hành vi API.",
    devClear: "Xóa mô phỏng",
    devHint: "Cài đặt được lưu trong bộ nhớ cục bộ.",
    devClose: "Đóng",

    badgeInaccessible: "Không thể truy cập",
    badgeMutual: "Tương hỗ",
    badgeNew: "Mới",
    badgeWhitelist: "Đã bỏ qua",
    badgeFollowed: "Đã theo dõi bạn",
    badgeNotFollowingBack: "Không theo dõi bạn",
    badgeUnfollowed: "Đã bỏ theo dõi",

    actionFollow: "Theo dõi",
    actionUnfollow: "Bỏ theo dõi",
    actionRemove: "Xóa",
    actionViewProfile: "Xem hồ sơ",
    actionWhitelistAdd: "Luôn bỏ qua",
    actionWhitelistRemove: "Xóa khỏi danh sách trắng",

    loadingProfile: "Đang lấy hồ sơ của bạn...",
    loadingFollowing: "Đang tải danh sách đang theo dõi...",
    loadingFollowers: "Đang tải danh sách người theo dõi...",
    loadingCalculating: "Đang tính toán...",

    processingLabel: "Đang xử lý",
    resumingLabel: "Đang tiếp tục",
    cancelledLabel: "Đã hủy ({done}/{total})",
    cancellingLabel: "Đang hủy...",

    connectChecking: "Đang xác minh...",
    connectErrorNoToken: "Dán Personal Access Token của bạn vào ô bên trên.",
    connectErrorExpired: "Token không hợp lệ hoặc đã hết hạn. Hãy tạo token mới.",
    connectErrorSession: "Phiên đã hết hạn. Token của bạn đã bị xóa. Hãy đăng nhập lại.",
    connectErrorTokenExpired: "Token đã lưu hết hạn hoặc bị thu hồi. Hãy tạo token mới.",

    errorTitle: "Đã xảy ra lỗi",
    errorRetry: "Thử lại",

    errorUnfollowInaccessible: "Không thể bỏ theo dõi {login}: hồ sơ không thể truy cập.",
    errorRateLimit: "Quá nhiều yêu cầu. Vui lòng đợi và thử lại.",
    errorGitHubTemp: "Lỗi tạm thời từ GitHub. Vui lòng thử lại.",
    errorUnfollow: "Lỗi khi bỏ theo dõi {login}: {message}",
    errorFollow: "Lỗi khi theo dõi {login}: {message}",

    importErrorFormat: "Định dạng tệp không hợp lệ.",
    importErrorGeneric: "Lỗi khi nhập: {message}",

    http400: "Nội dung gửi không chính xác. Vui lòng thử lại.",
    http401: "Phiên của bạn đã hết hạn. Vui lòng đăng nhập lại.",
    http403: "GitHub đã chặn yêu cầu này. Bạn có thể đã đạt đến giới hạn hoặc không có quyền.",
    http404: "Không tìm thấy tài nguyên này trên GitHub.",
    http422: "GitHub đã từ chối thao tác này. Hãy kiểm tra hồ sơ có công khai hay có hạn chế không.",
    http429: "Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi vài phút và thử lại.",
    http500: "Đã xảy ra lỗi trên máy chủ GitHub. Đây là lỗi tạm thời — hãy thử lại sau.<br>{statusLink}",
    http502: "GitHub tạm thời ngừng hoạt động. Vui lòng thử lại sau.<br>{statusLink}",
    http503: "GitHub tạm thời không khả dụng, có thể đang bảo trì. Thử lại sau vài phút.<br>{statusLink}",
    http504: "Kết nối đến GitHub bị quá thời gian. Kiểm tra kết nối internet và thử lại.<br>{statusLink}",
    httpUnknown: "Đã xảy ra lỗi GitHub không mong muốn (HTTP {status}). Vui lòng thử lại.",
    httpStatusLink: "Kiểm tra trạng thái GitHub",

    bgNetworkError: "Lỗi mạng",

    apiTimeout: "Yêu cầu đã vượt quá thời gian chờ. Kiểm tra kết nối của bạn.",
    apiNetworkError: "Không có kết nối internet. Kiểm tra mạng của bạn.",
  },

  pl: {
    tokenStep1Title: "Utwórz token",
    tokenStep1Desc:
      'Zakresy <code>read:user</code> + <code>user:follow</code> są wstępnie zaznaczone. Przewiń na dół strony i kliknij <strong>Generate token</strong>.',
    btnCreateToken: "Otwórz stronę tokenów GitHub",
    tokenStep2Title: "Skopiuj token",
    tokenStep2Desc: "Zaczyna się od <code>ghp_</code>",
    tokenStep3Title: "Wklej i połącz",
    tokenStep3Desc: 'W polu poniżej kliknij "Połącz"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Połącz",
    reportProblem: "Zgłoś problem",

    headerFollowers: "obserwujący",

    navResults: "Listy",
    navHistory: "Historia",
    navWhitelist: "Biała lista",

    tabAll: "Nie obserwują",
    tabNotFollowingBack: "Nie obserwuję",
    tabMutual: "Wzajemni",

    searchPlaceholder: "Filtruj po nazwie użytkownika... (/)",

    listLabelUnfollowers: "Nie obserwują cię z powrotem",
    listLabelMutual: "Wzajemni obserwujący",
    listLabelNotFollowingBack: "Kto cię obserwuje",

    btnCancel: "Anuluj",
    btnFollowAll: "Obserwuj wszystkich",
    btnUnfollowAll: "Przestań obserwować wszystkich",
    btnShow: "Pokaż",
    btnHide: "Ukryj",

    emptyFiltered: "Brak wyników dla tego filtra.",
    allFollowingBackTitle: "<strong>Wszystko w porządku!</strong>",
    allFollowingBackAll: "<strong>Wszystko w porządku!</strong> Wszyscy, których obserwujesz, obserwują cię z powrotem.",
    allFollowingBackMutual: "<strong>Brak wzajemnych obserwujących.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Obserwujesz z powrotem wszystkich, którzy cię obserwują.</strong>",

    unfollowableBanner: "{count} kont nie można automatycznie obserwować.",

    historyTitle: "Historia",
    historyHint: "30 dni",
    btnClearHistory: "Wyczyść",
    historyEmpty: "Nie zarejestrowano jeszcze żadnych zdarzeń.",
    historyTimeNow: "przed chwilą",

    whitelistTitle: "Biała lista",
    whitelistHint: "Zignorowani",
    whitelistEmpty: "Brak użytkowników na białej liście.",

    profileFollowers: "obserwujący",
    profileFollowing: "obserwowani",
    profileRepos: "repozytoria",
    profilePopularRepos: "Popularne repozytoria",
    profileNoRepos: "Brak publicznych repozytoriów.",
    profileLoading: "Ładowanie...",
    profileClose: "Zamknij (Esc)",
    profileWhitelistAdd: "Zawsze ignoruj",
    profileWhitelistRemove: "Usuń z białej listy",

    modalCancel: "Anuluj",
    modalTitleUnfollow: "Przestać obserwować?",
    modalTitleFollow: "Obserwować z powrotem?",
    modalTitleImport: "Importować dane?",
    modalTextUnfollow:
      "Zaraz przestaniesz obserwować <strong>{count}</strong> użytkownika(ów), którzy nie obserwują cię z powrotem.",
    modalTextFollow:
      "Zaraz zaczniesz obserwować <strong>{count}</strong> użytkownika(ów), którzy cię obserwują.",
    modalTextResumeFollow:
      "Zaraz zaczniesz obserwować <strong>{count}</strong> użytkownika(ów), którzy cię obserwują.",
    modalTextResumeUnfollow:
      "Zaraz przestaniesz obserwować <strong>{count}</strong> użytkownika(ów), którzy nie obserwują cię z powrotem.",
    modalTextImport:
      "Importuj <strong>{whitelistCount}</strong> użytkownika(ów) na białą listę i <strong>{historyCount}</strong> zdarzenie(a) historii.<br><br>Bieżące dane zostaną zastąpione.",
    modalConfirmUnfollow: "Tak, przestań obserwować",
    modalConfirmFollow: "Tak, obserwuj",
    modalConfirmImport: "Tak, importuj",

    menuTheme: "Zmień motyw",
    menuRefresh: "Odśwież dane",
    menuExport: "Eksportuj dane",
    menuImport: "Importuj dane",
    menuDev: "Symuluj błędy",
    menuReport: "Zgłoś problem",
    menuLogout: "Rozłącz",
    menuLanguage: "Język: {lang}",
    langPickerTitle: "Wybierz język",
    langPickerSearchPlaceholder: "Szukaj języka...",

    shortcutsHint: "1·2·3 zakładki  |  / szukaj  |  H historia  |  W biała lista  |  T motyw  |  Esc zamknij",

    devTitle: "Symulacja błędów",
    devDescription: "Wybierz scenariusz, aby symulować zachowanie API.",
    devClear: "Wyczyść symulację",
    devHint: "Ustawienia są przechowywane w pamięci lokalnej.",
    devClose: "Zamknij",

    badgeInaccessible: "Niedostępny",
    badgeMutual: "Wzajemny",
    badgeNew: "Nowy",
    badgeWhitelist: "Zignorowany",
    badgeFollowed: "Obserwuje cię",
    badgeNotFollowingBack: "Nie obserwuje cię",
    badgeUnfollowed: "Przestał obserwować",

    actionFollow: "Obserwuj",
    actionUnfollow: "Przestań obserwować",
    actionRemove: "Usuń",
    actionViewProfile: "Zobacz profil",
    actionWhitelistAdd: "Zawsze ignoruj",
    actionWhitelistRemove: "Usuń z białej listy",

    loadingProfile: "Pobieranie twojego profilu...",
    loadingFollowing: "Ładowanie listy obserwowanych...",
    loadingFollowers: "Ładowanie listy obserwujących...",
    loadingCalculating: "Obliczanie...",

    processingLabel: "Przetwarzanie",
    resumingLabel: "Wznawianie",
    cancelledLabel: "Anulowano ({done}/{total})",
    cancellingLabel: "Anulowanie...",

    connectChecking: "Weryfikacja...",
    connectErrorNoToken: "Wklej swój Personal Access Token powyżej.",
    connectErrorExpired: "Token jest nieprawidłowy lub wygasł. Wygeneruj nowy.",
    connectErrorSession: "Sesja wygasła. Twój token został usunięty. Zaloguj się ponownie.",
    connectErrorTokenExpired: "Zapisany token wygasł lub został odwołany. Wygeneruj nowy.",

    errorTitle: "Coś poszło nie tak",
    errorRetry: "Spróbuj ponownie",

    errorUnfollowInaccessible: "Nie można przestać obserwować {login}: profil niedostępny.",
    errorRateLimit: "Zbyt wiele żądań. Poczekaj i spróbuj ponownie.",
    errorGitHubTemp: "Tymczasowy błąd GitHub. Spróbuj ponownie.",
    errorUnfollow: "Błąd podczas przestawania obserwować {login}: {message}",
    errorFollow: "Błąd podczas obserwowania {login}: {message}",

    importErrorFormat: "Nieprawidłowy format pliku.",
    importErrorGeneric: "Błąd podczas importowania: {message}",

    http400: "Coś zostało wysłane nieprawidłowo. Spróbuj ponownie.",
    http401: "Twoja sesja wygasła. Zaloguj się ponownie.",
    http403: "GitHub zablokował to żądanie. Mogłeś osiągnąć limit lub nie masz uprawnień.",
    http404: "Nie można znaleźć tego zasobu na GitHub.",
    http422: "GitHub odrzucił tę operację. Sprawdź, czy profil jest publiczny lub czy są jakieś ograniczenia.",
    http429: "Zbyt wiele żądań w krótkim czasie. Odczekaj kilka minut i spróbuj ponownie.",
    http500: "Coś poszło nie tak na serwerach GitHub. To tymczasowe — spróbuj ponownie za chwilę.<br>{statusLink}",
    http502: "GitHub jest tymczasowo niedostępny. Spróbuj ponownie za chwilę.<br>{statusLink}",
    http503: "GitHub jest tymczasowo niedostępny, prawdopodobnie w trakcie konserwacji. Spróbuj ponownie za kilka minut.<br>{statusLink}",
    http504: "Połączenie z GitHub przekroczyło limit czasu. Sprawdź swoje połączenie internetowe i spróbuj ponownie.<br>{statusLink}",
    httpUnknown: "Wystąpił nieoczekiwany błąd GitHub (HTTP {status}). Spróbuj ponownie.",
    httpStatusLink: "Sprawdź status GitHub",

    bgNetworkError: "Błąd sieci",

    apiTimeout: "Żądanie przekroczyło limit czasu. Sprawdź połączenie.",
    apiNetworkError: "Brak połączenia z internetem. Sprawdź swoją sieć.",
  },

  nl: {
    tokenStep1Title: "Maak je token aan",
    tokenStep1Desc:
      'De scopes <code>read:user</code> + <code>user:follow</code> zijn vooraf geselecteerd. Scroll naar beneden en klik op <strong>Generate token</strong>.',
    btnCreateToken: "Open GitHub tokenpagina",
    tokenStep2Title: "Kopieer de token",
    tokenStep2Desc: "Begint met <code>ghp_</code>",
    tokenStep3Title: "Plak en verbind",
    tokenStep3Desc: 'Klik in het veld hieronder op "Verbinden"',
    tokenInputPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    btnConnect: "Verbinden",
    reportProblem: "Probleem melden",

    headerFollowers: "volgers",

    navResults: "Lijsten",
    navHistory: "Geschiedenis",
    navWhitelist: "Whitelist",

    tabAll: "Volgen niet terug",
    tabNotFollowingBack: "Volg niet",
    tabMutual: "Wederzijds",

    searchPlaceholder: "Filter op gebruikersnaam... (/)",

    listLabelUnfollowers: "Volgen je niet terug",
    listLabelMutual: "Wederzijdse volgers",
    listLabelNotFollowingBack: "Wie jou volgt",

    btnCancel: "Annuleren",
    btnFollowAll: "Allen volgen",
    btnUnfollowAll: "Stop met volgen van allen",
    btnShow: "Toon",
    btnHide: "Verberg",

    emptyFiltered: "Geen resultaten voor dit filter.",
    allFollowingBackTitle: "<strong>Alles in orde!</strong>",
    allFollowingBackAll: "<strong>Alles in orde!</strong> Iedereen die je volgt, volgt je terug.",
    allFollowingBackMutual: "<strong>Geen wederzijdse volgers.</strong>",
    allFollowingBackNotFollowingBack: "<strong>Je volgt iedereen terug die jou volgt.</strong>",

    unfollowableBanner: "{count} accounts kunnen niet automatisch worden gevolgd.",

    historyTitle: "Geschiedenis",
    historyHint: "30 dagen",
    btnClearHistory: "Wissen",
    historyEmpty: "Nog geen gebeurtenissen geregistreerd.",
    historyTimeNow: "zojuist",

    whitelistTitle: "Whitelist",
    whitelistHint: "Genegeerd",
    whitelistEmpty: "Geen gebruikers in de whitelist.",

    profileFollowers: "volgers",
    profileFollowing: "volgend",
    profileRepos: "repo's",
    profilePopularRepos: "Populaire repositories",
    profileNoRepos: "Geen openbare repositories.",
    profileLoading: "Laden...",
    profileClose: "Sluiten (Esc)",
    profileWhitelistAdd: "Altijd negeren",
    profileWhitelistRemove: "Verwijder uit whitelist",

    modalCancel: "Annuleren",
    modalTitleUnfollow: "Stop met volgen?",
    modalTitleFollow: "Terugvolgen?",
    modalTitleImport: "Gegevens importeren?",
    modalTextUnfollow:
      "Je staat op het punt om <strong>{count}</strong> gebruiker(s) die je niet terugvolgen te ontvolgen.",
    modalTextFollow:
      "Je staat op het punt om <strong>{count}</strong> gebruiker(s) die jou volgen te volgen.",
    modalTextResumeFollow:
      "Je staat op het punt om <strong>{count}</strong> gebruiker(s) die jou volgen te volgen.",
    modalTextResumeUnfollow:
      "Je staat op het punt om <strong>{count}</strong> gebruiker(s) die je niet terugvolgen te ontvolgen.",
    modalTextImport:
      "Importeer <strong>{whitelistCount}</strong> gebruiker(s) in de whitelist en <strong>{historyCount}</strong> geschiedenisgebeurtenis(sen).<br><br>Huidige gegevens worden vervangen.",
    modalConfirmUnfollow: "Ja, ontvolg",
    modalConfirmFollow: "Ja, volg",
    modalConfirmImport: "Ja, importeer",

    menuTheme: "Wissel thema",
    menuRefresh: "Ververs gegevens",
    menuExport: "Exporteer gegevens",
    menuImport: "Importeer gegevens",
    menuDev: "Simuleer fouten",
    menuReport: "Probleem melden",
    menuLogout: "Verbinding verbreken",
    menuLanguage: "Taal: {lang}",
    langPickerTitle: "Selecteer taal",
    langPickerSearchPlaceholder: "Zoek taal...",

    shortcutsHint: "1·2·3 tabbladen  |  / zoeken  |  H geschiedenis  |  W whitelist  |  T thema  |  Esc sluiten",

    devTitle: "Foutsimulatie",
    devDescription: "Selecteer een scenario om API-gedrag te simuleren.",
    devClear: "Simulatie wissen",
    devHint: "Instellingen blijven bewaard in de lokale opslag.",
    devClose: "Sluiten",

    badgeInaccessible: "Niet toegankelijk",
    badgeMutual: "Wederzijds",
    badgeNew: "Nieuw",
    badgeWhitelist: "Genegeerd",
    badgeFollowed: "Volgde jou",
    badgeNotFollowingBack: "Volgt jou niet",
    badgeUnfollowed: "Ontvolgd",

    actionFollow: "Volgen",
    actionUnfollow: "Ontvolgen",
    actionRemove: "Verwijderen",
    actionViewProfile: "Bekijk profiel",
    actionWhitelistAdd: "Altijd negeren",
    actionWhitelistRemove: "Verwijder uit whitelist",

    loadingProfile: "Je profiel ophalen...",
    loadingFollowing: "Volglijst laden...",
    loadingFollowers: "Volgerslijst laden...",
    loadingCalculating: "Berekenen...",

    processingLabel: "Bezig met verwerken",
    resumingLabel: "Bezig met hervatten",
    cancelledLabel: "Geannuleerd ({done}/{total})",
    cancellingLabel: "Bezig met annuleren...",

    connectChecking: "Bezig met verifiëren...",
    connectErrorNoToken: "Plak hierboven je Personal Access Token.",
    connectErrorExpired: "Ongeldige of verlopen token. Genereer een nieuwe.",
    connectErrorSession: "Sessie verlopen. Je token is verwijderd. Log opnieuw in.",
    connectErrorTokenExpired: "Opgeslagen token is verlopen of ingetrokken. Genereer een nieuwe.",

    errorTitle: "Er is iets misgegaan",
    errorRetry: "Opnieuw proberen",

    errorUnfollowInaccessible: "Kon {login} niet ontvolgen: profiel niet toegankelijk.",
    errorRateLimit: "Te veel verzoeken. Wacht en probeer het opnieuw.",
    errorGitHubTemp: "Tijdelijke GitHub-fout. Probeer het opnieuw.",
    errorUnfollow: "Fout bij ontvolgen van {login}: {message}",
    errorFollow: "Fout bij volgen van {login}: {message}",

    importErrorFormat: "Ongeldig bestandsformaat.",
    importErrorGeneric: "Fout bij importeren: {message}",

    http400: "Er is iets verkeerd verzonden. Probeer het opnieuw.",
    http401: "Je sessie is verlopen. Log opnieuw in.",
    http403: "GitHub heeft dit verzoek geblokkeerd. Mogelijk heb je de limiet bereikt of geen toestemming.",
    http404: "Kon deze bron niet vinden op GitHub.",
    http422: "GitHub heeft deze bewerking geweigerd. Controleer of het profiel openbaar is of beperkingen heeft.",
    http429: "Te veel verzoeken in korte tijd. Wacht een paar minuten en probeer het opnieuw.",
    http500: "Er is iets misgegaan op de servers van GitHub. Dit is tijdelijk — probeer het over een paar seconden opnieuw.<br>{statusLink}",
    http502: "GitHub is tijdelijk offline. Probeer het over een paar seconden opnieuw.<br>{statusLink}",
    http503: "GitHub is tijdelijk niet beschikbaar, mogelijk vanwege onderhoud. Probeer het over een paar minuten opnieuw.<br>{statusLink}",
    http504: "De verbinding met GitHub duurde te lang en is verbroken. Controleer je internetverbinding en probeer het opnieuw.<br>{statusLink}",
    httpUnknown: "Er is een onverwachte GitHub-fout opgetreden (HTTP {status}). Probeer het opnieuw.",
    httpStatusLink: "Bekijk GitHub-status",

    bgNetworkError: "Netwerkfout",

    apiTimeout: "Het verzoek heeft de timeout overschreden. Controleer je verbinding.",
    apiNetworkError: "Geen internetverbinding. Controleer je netwerk.",
  },
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {string} */
let currentLocale = DEFAULT;

// ---------------------------------------------------------------------------
// Interpolation helper
// ---------------------------------------------------------------------------

/**
 * @param {string} str
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retorna string traduzida para a locale atual.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const locale = TRANSLATIONS[currentLocale];
  if (locale && key in locale) {
    return interpolate(locale[key], params);
  }
  const fallback = TRANSLATIONS[DEFAULT];
  if (fallback && key in fallback) {
    return interpolate(fallback[key], params);
  }
  return `[${key}]`;
}

/**
 * Igual a t(), mas retorna string adequada para innerHTML (contém HTML).
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function tHtml(key, params) {
  return t(key, params);
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/** @returns {string} locale adequado para Intl (ex: "pt-BR", "zh-CN") */
export function getIntlLocale() {
  return LOCALE_MAP[currentLocale] || "en";
}

/**
 * Alterna para locale e persiste.
 * @param {string} locale
 */
export async function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale = locale;
  await setStorage(LOCALE_KEY, locale);
  applyI18nToDOM();
  document.documentElement.lang = LOCALE_MAP[currentLocale] || "en";
}

/**
 * Detecta locale preferida: storage > navigator > default.
 * @returns {Promise<string>}
 */
export async function initI18n() {
  const saved = await getStorage(LOCALE_KEY);
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    currentLocale = saved;
  } else {
    const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
    currentLocale = SUPPORTED_LOCALES.includes(browserLang) ? browserLang : DEFAULT;
  }
  document.documentElement.lang = LOCALE_MAP[currentLocale] || "en";
  return currentLocale;
}

// ---------------------------------------------------------------------------
// DOM scanner — aplica traduções a elementos estáticos no HTML
// ---------------------------------------------------------------------------

/**
 * Varre o DOM por atributos data-i18n e aplica as traduções.
 * - data-i18n → element.textContent (ou innerHTML se contiver HTML)
 * - data-i18n-placeholder → element.placeholder
 * - data-i18n-title → element.title
 * - data-i18n-aria-label → element.ariaLabel
 */
export function applyI18nToDOM() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const text = t(key);
    if (el.getAttribute("data-i18n-html") === "true" || /<[^>]+>/.test(text)) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", t(key));
  });

  document.querySelectorAll("[data-i18n-value]").forEach((el) => {
    const key = el.getAttribute("data-i18n-value");
    if (key) el.value = t(key);
  });
}
