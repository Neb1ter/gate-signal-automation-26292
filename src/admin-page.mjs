function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderAdminPage({
  runtimeSettings,
  knownChats,
  configuredChatLabels,
  signalCount,
  dryRun,
  autoExecutionEnabled,
  runtimeAiEnabled,
  runtimeGateMode,
  defaultFeishuConfigured,
  telegramSourceMode,
  telegramRuntimeSummary,
  port,
  publicBaseUrl,
}) {
  const bootstrap = safeJson({
    runtimeSettings,
    knownChats,
    configuredChatLabels,
    signalCount,
    dryRun,
    autoExecutionEnabled,
    runtimeAiEnabled,
    runtimeGateMode,
    defaultFeishuConfigured,
    telegramSourceMode,
    telegramRuntimeSummary,
    port,
    publicBaseUrl,
  });

  const accessEntry = publicBaseUrl || `http://127.0.0.1:${port}`;
  const isCloudEntry =
    Boolean(publicBaseUrl) &&
    !/^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(?::|\/|$)/i.test(String(publicBaseUrl));

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>交易信号后台</title>
    <style>
      :root {
        --bg: #f6f8fc;
        --card: #ffffff;
        --text: #182233;
        --muted: #61708a;
        --line: #dbe2ee;
        --accent: #0f6fff;
        --accent-soft: #eaf2ff;
        --ok: #157347;
        --warn: #9a5b00;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #fbfdff 0%, var(--bg) 100%);
        color: var(--text);
        font: 14px/1.6 "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .shell {
        max-width: 1380px;
        margin: 0 auto;
        padding: 28px 18px 40px;
      }
      .hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }
      h1, h2, h3, p { margin: 0; }
      .hero-copy p {
        margin-top: 8px;
        color: var(--muted);
        max-width: 860px;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      button,
      .button-link {
        border: 0;
        border-radius: 12px;
        padding: 11px 16px;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .button-primary {
        background: var(--accent);
        color: #fff;
      }
      .button-secondary {
        background: #edf2f9;
        color: var(--text);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 12px 30px rgba(16, 29, 62, 0.05);
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .metric-value {
        margin-top: 8px;
        font-size: 28px;
        font-weight: 700;
      }
      .metric-hint {
        margin-top: 8px;
        color: var(--muted);
        font-size: 12px;
        word-break: break-all;
      }
      .panel-grid {
        display: grid;
        grid-template-columns: minmax(420px, 520px) minmax(0, 1fr);
        gap: 18px;
      }
      .stack {
        display: grid;
        gap: 18px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 700;
      }
      .section-copy {
        margin-top: 6px;
        color: var(--muted);
      }
      .field {
        margin-top: 16px;
      }
      .field label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .field small {
        display: block;
        color: var(--muted);
        margin-top: 6px;
      }
      textarea,
      select,
      input[type="text"],
      input[type="url"],
      input[type="password"] {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px 14px;
        font: inherit;
        background: #fff;
      }
      textarea {
        min-height: 90px;
        resize: vertical;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 18px;
      }
      th,
      td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .chat-title {
        font-weight: 600;
      }
      .chat-meta,
      .empty,
      .status-line,
      .inline-help {
        color: var(--muted);
      }
      .status-line {
        min-height: 22px;
        margin-top: 12px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
        margin-top: 10px;
      }
      .route-grid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }
      .route-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px;
        background: #fbfcff;
      }
      .route-card h3 {
        font-size: 15px;
      }
      .route-card p {
        margin-top: 4px;
        color: var(--muted);
      }
      .route-fields {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .hint-list {
        display: grid;
        gap: 10px;
        margin-top: 14px;
        color: var(--muted);
      }
      @media (max-width: 1180px) {
        .grid,
        .panel-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="hero">
        <div class="hero-copy">
          <h1>交易信号后台</h1>
          <p>这里可以管理 Telegram 监听群、分析师分群转发、新闻自动 / 手动交易模式、AI 结构化能力，以及 Gate 模拟跟单配置。</p>
          <div class="badge">分析师原文会先脱敏，再按结构化卡片发送到对应飞书群，确认后再决定是否跟单。</div>
        </div>
        <div class="actions">
          <a href="/pending" class="button-link button-secondary">查看待决策</a>
          <a href="/logout" class="button-link button-secondary">退出登录</a>
          <button id="reload" class="button-secondary" type="button">刷新</button>
          <button id="save" class="button-primary" type="button">保存设置</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="metric-label">已存信号</div>
          <div class="metric-value">${escapeHtml(signalCount)}</div>
          <div class="metric-hint">当前数据库中已保存的信号数量</div>
        </div>
        <div class="card">
          <div class="metric-label">下单模式</div>
          <div class="metric-value">${dryRun ? "模拟" : "真实"}</div>
          <div class="metric-hint">${dryRun ? "当前不会真实下单" : "当前允许真实交易"}</div>
        </div>
        <div class="card">
          <div class="metric-label">自动执行总开关</div>
          <div class="metric-value">${autoExecutionEnabled ? "开启" : "关闭"}</div>
          <div class="metric-hint">只影响新闻自动单，不影响分析师审批流</div>
        </div>
        <div class="card">
          <div class="metric-label">当前入口</div>
          <div class="metric-value">${escapeHtml(isCloudEntry ? "云端" : "本机")}</div>
          <div class="metric-hint">${escapeHtml(accessEntry)}</div>
        </div>
        <div class="card">
          <div class="metric-label">Telegram 监听身份</div>
          <div class="metric-value">${escapeHtml(telegramSourceMode === "user" ? "个人号" : "Bot")}</div>
          <div class="metric-hint">${escapeHtml(telegramRuntimeSummary || "尚未连接")}</div>
        </div>
        <div class="card">
          <div class="metric-label">AI 结构化</div>
          <div class="metric-value">${runtimeSettings.ai?.enabled ? "开启" : "关闭"}</div>
          <div class="metric-hint">当前运行态：${escapeHtml(runtimeAiEnabled ? "已启用" : "未启用")}</div>
        </div>
        <div class="card">
          <div class="metric-label">Gate 跟单通道</div>
          <div class="metric-value">${escapeHtml(runtimeSettings.gate?.mode === "testnet" ? "Gate 模拟" : "本地 Dry Run")}</div>
          <div class="metric-hint">当前运行态：${escapeHtml(runtimeGateMode === "testnet" ? "Gate 模拟交易" : "本地 Dry Run")}</div>
        </div>
      </div>

      <div class="panel-grid">
        <div class="stack">
          <div class="card">
            <div class="section-title">新闻交易模式</div>
            <p class="section-copy">分析师消息始终先发飞书，由你手动决策。这里控制的是新闻命中策略后，是自动交易还是先等你确认。</p>
            <div class="field">
              <label for="newsMode">新闻交易模式</label>
              <select id="newsMode">
                <option value="auto" ${runtimeSettings.execution?.newsMode === "manual" ? "" : "selected"}>自动交易</option>
                <option value="manual" ${runtimeSettings.execution?.newsMode === "manual" ? "selected" : ""}>手动确认</option>
              </select>
              <small>自动交易：命中新闻策略后直接执行。手动确认：先发飞书，再由你决定是否跟单。</small>
            </div>
          </div>

          <div class="card">
            <div class="section-title">Telegram 群监听配置</div>
            <p class="section-copy">如果某个群还没被自动识别，可以直接在这里填入 chat id。多个 ID 用英文逗号分隔。</p>

            <div class="field">
              <label for="allowedCsv">允许监听的群 ID</label>
              <textarea id="allowedCsv"></textarea>
              <small>只有这里的群才会被处理。留空时等于允许所有已分类群。</small>
            </div>

            <div class="field">
              <label for="newsCsv">新闻群 ID</label>
              <textarea id="newsCsv"></textarea>
            </div>

            <div class="field">
              <label for="analystCsv">分析师群 ID</label>
              <textarea id="analystCsv"></textarea>
            </div>
          </div>

          <div class="card">
            <div class="section-title">AI 文案结构化配置</div>
            <p class="section-copy">不开启也能用本地规则解析；开启后，系统会额外调用 AI 对分析师文案做规范化判断和字段补全。</p>
            <div class="field">
              <label for="aiEnabled">AI 结构化开关</label>
              <select id="aiEnabled">
                <option value="false" ${runtimeSettings.ai?.enabled ? "" : "selected"}>关闭</option>
                <option value="true" ${runtimeSettings.ai?.enabled ? "selected" : ""}>开启</option>
              </select>
            </div>
            <div class="field">
              <label for="aiBaseUrl">AI API Base URL</label>
              <input id="aiBaseUrl" type="url" placeholder="https://api.openai.com/v1" value="${escapeHtml(runtimeSettings.ai?.baseUrl || "")}" />
            </div>
            <div class="field">
              <label for="aiModel">AI 模型</label>
              <input id="aiModel" type="text" placeholder="例如 gpt-5.4-mini 或你自己的兼容模型" value="${escapeHtml(runtimeSettings.ai?.model || "")}" />
            </div>
            <div class="field">
              <label for="aiApiKey">AI API Key</label>
              <input id="aiApiKey" type="password" placeholder="留空则继续沿用当前已保存的 Key" value="${escapeHtml(runtimeSettings.ai?.apiKey || "")}" />
            </div>
            <div class="field">
              <label for="aiTimeoutMs">AI 超时（毫秒）</label>
              <input id="aiTimeoutMs" type="text" value="${escapeHtml(runtimeSettings.ai?.timeoutMs || 10000)}" />
            </div>
          </div>

          <div class="card">
            <div class="section-title">Gate 模拟跟单配置</div>
            <p class="section-copy">当前建议先接 Gate 模拟交易。保存后，分析师确认跟单会优先走这里的模拟 API；如果不开，则仍然使用本地 Dry Run。</p>
            <div class="field">
              <label for="gateMode">Gate 跟单模式</label>
              <select id="gateMode">
                <option value="dry_run" ${runtimeSettings.gate?.mode === "testnet" ? "" : "selected"}>本地 Dry Run</option>
                <option value="testnet" ${runtimeSettings.gate?.mode === "testnet" ? "selected" : ""}>Gate 模拟交易</option>
              </select>
            </div>
            <div class="field">
              <label for="gateBaseUrl">Gate API Base URL</label>
              <input id="gateBaseUrl" type="url" placeholder="https://api-testnet.gateapi.io" value="${escapeHtml(runtimeSettings.gate?.baseUrl || "")}" />
              <small>建议模拟交易填写官方 Testnet 地址。</small>
            </div>
            <div class="field">
              <label for="gateApiKey">Gate API Key</label>
              <input id="gateApiKey" type="password" placeholder="模拟交易 API Key" value="${escapeHtml(runtimeSettings.gate?.apiKey || "")}" />
            </div>
            <div class="field">
              <label for="gateApiSecret">Gate API Secret</label>
              <input id="gateApiSecret" type="password" placeholder="模拟交易 API Secret" value="${escapeHtml(runtimeSettings.gate?.apiSecret || "")}" />
            </div>
          </div>

          <div class="card">
            <div class="section-title">分析师分群转发</div>
            <p class="section-copy">你可以把不同的 Telegram 分析师群分别转发到不同的飞书群。每个飞书群都需要自己的 webhook。</p>
            <div class="badge">${defaultFeishuConfigured ? "已存在默认飞书群：未单独配置时会回落到默认群" : "当前没有默认飞书群：请至少给分析师群配置一个 webhook"}</div>
            <div id="analystRoutesWrap" class="route-grid"></div>
          </div>

          <div class="card">
            <div class="section-title">使用说明</div>
            <div class="hint-list">
              <div>1. 右侧“已发现的 Telegram 群聊”里勾选哪些群属于“新闻群”或“分析师群”。</div>
              <div>2. 分析师消息会尽量按结构化格式转发；无法下单的纯分析，也会作为结构化观点卡片发送。</div>
              <div>3. 飞书消息里只展示脱敏后的正文，不再额外显示“隐私处理”提示语。</div>
              <div>4. Gate 模拟交易需要你自己的模拟 API Key / Secret；未配置时仍会走本地 Dry Run。</div>
            </div>
            <div class="status-line" id="statusLine"></div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">已发现的 Telegram 群聊</div>
          <p class="section-copy">这里会把系统见过的群，以及你手工配置但还没收到过首条消息的群一起展示出来。你不用再自己记 chat id，只要看群名即可。</p>
          <div id="chatTableWrap"></div>
        </div>
      </div>
    </div>

    <script id="bootstrap" type="application/json">${bootstrap}</script>
    <script>
      const bootstrap = JSON.parse(document.getElementById("bootstrap").textContent);
      const discoveredIds = new Set(bootstrap.knownChats.map((chat) => String(chat.id)));
      const state = {
        allowed: new Set((bootstrap.runtimeSettings.telegram.allowedChatIds || []).map(String)),
        news: new Set((bootstrap.runtimeSettings.telegram.newsChatIds || []).map(String)),
        analyst: new Set((bootstrap.runtimeSettings.telegram.analystChatIds || []).map(String)),
        analystRoutes: new Map(
          (bootstrap.runtimeSettings.feishu?.analystRoutes || []).map((route) => [
            String(route.chatId),
            {
              webhookUrl: String(route.webhookUrl || ""),
              displayName: String(route.displayName || ""),
            },
          ]),
        ),
        newsMode: bootstrap.runtimeSettings.execution?.newsMode === "manual" ? "manual" : "auto",
        ai: {
          enabled: Boolean(bootstrap.runtimeSettings.ai?.enabled),
          baseUrl: String(bootstrap.runtimeSettings.ai?.baseUrl || ""),
          model: String(bootstrap.runtimeSettings.ai?.model || ""),
          apiKey: String(bootstrap.runtimeSettings.ai?.apiKey || ""),
          timeoutMs: String(bootstrap.runtimeSettings.ai?.timeoutMs || "10000"),
        },
        gate: {
          mode: String(bootstrap.runtimeSettings.gate?.mode || "dry_run"),
          baseUrl: String(bootstrap.runtimeSettings.gate?.baseUrl || ""),
          apiKey: String(bootstrap.runtimeSettings.gate?.apiKey || ""),
          apiSecret: String(bootstrap.runtimeSettings.gate?.apiSecret || ""),
        },
      };

      const allowedCsv = document.getElementById("allowedCsv");
      const newsCsv = document.getElementById("newsCsv");
      const analystCsv = document.getElementById("analystCsv");
      const newsMode = document.getElementById("newsMode");
      const aiEnabled = document.getElementById("aiEnabled");
      const aiBaseUrl = document.getElementById("aiBaseUrl");
      const aiModel = document.getElementById("aiModel");
      const aiApiKey = document.getElementById("aiApiKey");
      const aiTimeoutMs = document.getElementById("aiTimeoutMs");
      const gateMode = document.getElementById("gateMode");
      const gateBaseUrl = document.getElementById("gateBaseUrl");
      const gateApiKey = document.getElementById("gateApiKey");
      const gateApiSecret = document.getElementById("gateApiSecret");
      const statusLine = document.getElementById("statusLine");
      const chatTableWrap = document.getElementById("chatTableWrap");
      const analystRoutesWrap = document.getElementById("analystRoutesWrap");

      function escapeClientHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function parseCsv(value) {
        return String(value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      function nonDiscoveredFromSet(set) {
        return [...set].filter((id) => !discoveredIds.has(id)).join(", ");
      }

      function getKnownChatMap() {
        const map = new Map();
        for (const chat of bootstrap.knownChats) {
          const id = String(chat.id);
          map.set(id, {
            ...chat,
            title: bootstrap.configuredChatLabels?.[id] || chat.title || id,
            isConfiguredOnly: false,
          });
        }
        return map;
      }

      function getConfiguredOnlyChat(id) {
        return {
          id,
          title: bootstrap.configuredChatLabels?.[id] || "手动配置的群聊",
          username: "",
          type: "configured",
          lastSeenAt: "",
          lastText: "系统还没在这个群里收到首条新消息",
          isConfiguredOnly: true,
        };
      }

      function getVisibleChats() {
        const knownMap = getKnownChatMap();
        const configuredIds = new Set([
          ...state.allowed,
          ...state.news,
          ...state.analyst,
          ...state.analystRoutes.keys(),
        ]);

        for (const id of configuredIds) {
          if (!knownMap.has(id)) {
            knownMap.set(id, getConfiguredOnlyChat(id));
          }
        }

        return [...knownMap.values()].sort((a, b) => {
          const aConfiguredOnly = a.isConfiguredOnly ? 1 : 0;
          const bConfiguredOnly = b.isConfiguredOnly ? 1 : 0;
          if (aConfiguredOnly !== bConfiguredOnly) {
            return aConfiguredOnly - bConfiguredOnly;
          }
          return String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || ""));
        });
      }

      function getChatTitle(id) {
        const visible = getVisibleChats().find((chat) => String(chat.id) === String(id));
        return visible?.title || bootstrap.configuredChatLabels?.[String(id)] || String(id);
      }

      function syncManualFields() {
        allowedCsv.value = nonDiscoveredFromSet(state.allowed);
        newsCsv.value = nonDiscoveredFromSet(state.news);
        analystCsv.value = nonDiscoveredFromSet(state.analyst);
        newsMode.value = state.newsMode;
        aiEnabled.value = state.ai.enabled ? "true" : "false";
        aiBaseUrl.value = state.ai.baseUrl;
        aiModel.value = state.ai.model;
        aiApiKey.value = state.ai.apiKey;
        aiTimeoutMs.value = state.ai.timeoutMs;
        gateMode.value = state.gate.mode;
        gateBaseUrl.value = state.gate.baseUrl;
        gateApiKey.value = state.gate.apiKey;
        gateApiSecret.value = state.gate.apiSecret;
      }

      function checked(set, id) {
        return set.has(String(id)) ? "checked" : "";
      }

      function renderChats() {
        const chats = getVisibleChats();
        if (!chats.length) {
          chatTableWrap.innerHTML = '<p class="empty">目前还没有自动识别到任何 Telegram 群，也没有手动配置的群 ID。你可以先在左侧填入群 ID，或者先让系统收到一条新消息。</p>';
          return;
        }

        const rows = chats
          .map((chat) => {
            const id = String(chat.id);
            const title = escapeClientHtml(chat.title || chat.username || id);
            const metaParts = [id];
            if (chat.username) metaParts.push("@" + chat.username);
            if (chat.type) metaParts.push(chat.type);
            if (chat.isConfiguredOnly) metaParts.push("等待首条消息");
            const helpText = escapeClientHtml(chat.lastText || "");
            return \`
              <tr>
                <td>
                  <div class="chat-title">\${title}</div>
                  <div class="chat-meta">\${escapeClientHtml(metaParts.join(" | "))}</div>
                  <div class="inline-help">\${helpText}</div>
                </td>
                <td>\${escapeClientHtml(chat.lastSeenAt || "尚未收到")}</td>
                <td><input type="checkbox" data-bucket="allowed" data-id="\${id}" \${checked(state.allowed, id)} /></td>
                <td><input type="checkbox" data-bucket="news" data-id="\${id}" \${checked(state.news, id)} /></td>
                <td><input type="checkbox" data-bucket="analyst" data-id="\${id}" \${checked(state.analyst, id)} /></td>
              </tr>
            \`;
          })
          .join("");

        chatTableWrap.innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>群聊</th>
                <th>最近收到</th>
                <th>允许监听</th>
                <th>新闻群</th>
                <th>分析师群</th>
              </tr>
            </thead>
            <tbody>\${rows}</tbody>
          </table>
        \`;
      }

      function renderAnalystRoutes() {
        const analystIds = [...state.analyst].sort((a, b) => getChatTitle(a).localeCompare(getChatTitle(b), "zh-CN"));
        if (!analystIds.length) {
          analystRoutesWrap.innerHTML = '<div class="empty">先在右侧把某个 Telegram 群勾成“分析师群”，这里才会出现对应的飞书路由配置。</div>';
          return;
        }

        analystRoutesWrap.innerHTML = analystIds
          .map((chatId) => {
            const route = state.analystRoutes.get(chatId) || { webhookUrl: "", displayName: "" };
            return \`
              <section class="route-card">
                <h3>\${escapeClientHtml(getChatTitle(chatId))}</h3>
                <p>Telegram 群 ID：\${escapeClientHtml(chatId)}</p>
                <div class="route-fields">
                  <div>
                    <label>飞书群显示名</label>
                    <input
                      type="text"
                      data-route-id="\${escapeClientHtml(chatId)}"
                      data-route-field="displayName"
                      value="\${escapeClientHtml(route.displayName)}"
                      placeholder="例如：三马哥策略专线"
                    />
                    <small>飞书消息里会显示这个名字，而不是 Telegram 原始作者身份。</small>
                  </div>
                  <div>
                    <label>飞书机器人 Webhook</label>
                    <input
                      type="url"
                      data-route-id="\${escapeClientHtml(chatId)}"
                      data-route-field="webhookUrl"
                      value="\${escapeClientHtml(route.webhookUrl)}"
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    />
                    <small>留空时会回落到默认飞书群；填写后，这个分析师群就会单独发到指定的飞书群。</small>
                  </div>
                </div>
              </section>
            \`;
          })
          .join("");
      }

      function refreshStatus(message, isError) {
        statusLine.textContent = message || "";
        statusLine.style.color = isError ? "#9a5b00" : "#157347";
      }

      document.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const bucket = target.dataset.bucket;
        const id = target.dataset.id;
        if (!bucket || !id || !state[bucket]) return;
        if (target.checked) {
          state[bucket].add(id);
        } else {
          state[bucket].delete(id);
        }
        syncManualFields();
        renderChats();
        renderAnalystRoutes();
      });

      document.addEventListener("input", (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement) {
          const routeId = target.dataset.routeId;
          const routeField = target.dataset.routeField;
          if (routeId && routeField) {
            const current = state.analystRoutes.get(routeId) || { webhookUrl: "", displayName: "" };
            current[routeField] = target.value;
            state.analystRoutes.set(routeId, current);
          }
        }
      });

      newsMode.addEventListener("change", () => {
        state.newsMode = newsMode.value === "manual" ? "manual" : "auto";
      });

      aiEnabled.addEventListener("change", () => {
        state.ai.enabled = aiEnabled.value === "true";
      });
      aiBaseUrl.addEventListener("input", () => { state.ai.baseUrl = aiBaseUrl.value.trim(); });
      aiModel.addEventListener("input", () => { state.ai.model = aiModel.value.trim(); });
      aiApiKey.addEventListener("input", () => { state.ai.apiKey = aiApiKey.value.trim(); });
      aiTimeoutMs.addEventListener("input", () => { state.ai.timeoutMs = aiTimeoutMs.value.trim(); });
      gateMode.addEventListener("change", () => { state.gate.mode = gateMode.value === "testnet" ? "testnet" : "dry_run"; });
      gateBaseUrl.addEventListener("input", () => { state.gate.baseUrl = gateBaseUrl.value.trim(); });
      gateApiKey.addEventListener("input", () => { state.gate.apiKey = gateApiKey.value.trim(); });
      gateApiSecret.addEventListener("input", () => { state.gate.apiSecret = gateApiSecret.value.trim(); });

      document.getElementById("reload").addEventListener("click", () => {
        location.reload();
      });

      document.getElementById("save").addEventListener("click", async () => {
        const payload = {
          telegram: {
            allowedChatIds: [...new Set([...state.allowed, ...parseCsv(allowedCsv.value)])],
            newsChatIds: [...new Set([...state.news, ...parseCsv(newsCsv.value)])],
            analystChatIds: [...new Set([...state.analyst, ...parseCsv(analystCsv.value)])],
          },
          feishu: {
            analystRoutes: [...state.analyst]
              .map((chatId) => {
                const route = state.analystRoutes.get(chatId) || {};
                return {
                  chatId,
                  displayName: String(route.displayName || "").trim(),
                  webhookUrl: String(route.webhookUrl || "").trim(),
                };
              })
              .filter((route) => route.displayName || route.webhookUrl),
          },
          execution: {
            newsMode: state.newsMode,
          },
          ai: {
            enabled: state.ai.enabled,
            baseUrl: state.ai.baseUrl,
            model: state.ai.model,
            apiKey: state.ai.apiKey,
            timeoutMs: Number.parseInt(state.ai.timeoutMs || "10000", 10) || 10000,
          },
          gate: {
            mode: state.gate.mode,
            baseUrl: state.gate.baseUrl,
            apiKey: state.gate.apiKey,
            apiSecret: state.gate.apiSecret,
          },
        };

        refreshStatus("保存中...", false);

        try {
          const response = await fetch("/api/runtime-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const saved = await response.json();
          state.allowed = new Set((saved.telegram.allowedChatIds || []).map(String));
          state.news = new Set((saved.telegram.newsChatIds || []).map(String));
          state.analyst = new Set((saved.telegram.analystChatIds || []).map(String));
          state.analystRoutes = new Map(
            (saved.feishu?.analystRoutes || []).map((route) => [
              String(route.chatId),
              {
                webhookUrl: String(route.webhookUrl || ""),
                displayName: String(route.displayName || ""),
              },
            ]),
          );
          state.newsMode = saved.execution?.newsMode === "manual" ? "manual" : "auto";
          state.ai = {
            enabled: Boolean(saved.ai?.enabled),
            baseUrl: String(saved.ai?.baseUrl || ""),
            model: String(saved.ai?.model || ""),
            apiKey: String(saved.ai?.apiKey || ""),
            timeoutMs: String(saved.ai?.timeoutMs || "10000"),
          };
          state.gate = {
            mode: String(saved.gate?.mode || "dry_run"),
            baseUrl: String(saved.gate?.baseUrl || ""),
            apiKey: String(saved.gate?.apiKey || ""),
            apiSecret: String(saved.gate?.apiSecret || ""),
          };

          syncManualFields();
          renderChats();
          renderAnalystRoutes();
          refreshStatus("设置已保存。新的 Telegram 消息会按最新配置继续流转。", false);
        } catch (error) {
          refreshStatus("保存失败：" + (error?.message || error), true);
        }
      });

      syncManualFields();
      renderChats();
      renderAnalystRoutes();
    </script>
  </body>
</html>`;
}
