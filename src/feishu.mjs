function formatSignalType(sourceType) {
  return sourceType === "analyst" ? "分析师策略" : "新闻消息";
}

function formatExecutionStatus(status) {
  const map = {
    pending_approval: "等待你确认",
    ready_for_execution: "准备自动执行",
    dry_run_ready: "命中自动策略，等待模拟执行",
    dry_run_executed: "模拟执行完成",
    executed: "已执行",
    rejected: "已忽略",
    blocked_risk: "已被风控拦截",
    notify_only: "仅提醒",
    execution_failed: "执行失败",
  };
  return map[status] || status || "未知";
}

function formatResultStatus(status) {
  const map = {
    dry_run: "模拟执行完成",
    submitted: "已提交到 Gate",
    rejected: "已忽略",
    failed: "执行失败",
    skipped: "未执行",
  };
  return map[status] || status || "未知";
}

function getDisplaySource(signal, options) {
  if (options?.displayName) {
    return options.displayName;
  }
  if (signal.sourceType === "analyst") {
    return signal.displaySourceName || "分析师专线";
  }
  return signal.sourceName || "信号源";
}

function getDisplayText(signal) {
  return String(signal.displayText || signal.text || "").trim();
}

function truncateText(text, limit = 3500) {
  const value = String(text || "");
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, Math.max(0, limit - 12))}\n\n[内容已截断]`;
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("`", "\\`")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

function formatSignalDirection(signal) {
  const normalized = String(signal.analysis?.direction || "").toLowerCase();
  if (normalized === "buy") {
    return signal.analysis?.directionLabel || "做多";
  }
  if (normalized === "sell") {
    return signal.analysis?.directionLabel || "做空 / 减仓";
  }
  if (signal.sourceType === "news") {
    return "消息触发";
  }
  return signal.analysis?.directionLabel || "观点更新";
}

function formatSignalAsset(signal) {
  if (signal.analysis?.asset) {
    return String(signal.analysis.asset).toUpperCase();
  }
  if (signal.tradeIdea?.symbol) {
    return String(signal.tradeIdea.symbol).split("_")[0]?.toUpperCase() || "未识别标的";
  }
  return "未识别标的";
}

function getReadableExecutionReason(signal) {
  if (signal.sourceType === "analyst") {
    if (signal.executionStatus === "pending_approval") {
      return signal.tradeIdea
        ? "AI 已整理出结构化交易建议，等待你确认是否跟单。"
        : "AI 已完成结构化摘要，但暂未形成可直接执行的订单。";
    }
    if (signal.executionStatus === "notify_only") {
      return "这条分析暂时只做提醒，不会自动下单。";
    }
  }

  if (signal.sourceType === "news") {
    if (signal.executionStatus === "ready_for_execution") {
      return "这条新闻已命中自动交易条件，系统会继续执行。";
    }
    if (signal.executionStatus === "blocked_risk") {
      return "这条新闻命中了策略，但被风控规则拦截。";
    }
    if (signal.executionStatus === "pending_approval") {
      return "当前新闻模式是手动确认，等待你决定是否执行。";
    }
  }

  return String(signal.executionReason || "").trim() || "等待处理。";
}

function buildSignalTitle(signal, displaySource) {
  if (signal.sourceType !== "analyst") {
    return signal.tradeIdea?.symbol
      ? `新闻交易提醒｜${signal.tradeIdea.symbol}`
      : "新闻交易提醒";
  }

  const asset = formatSignalAsset(signal);
  const direction = formatSignalDirection(signal);
  return `${displaySource}｜${asset} ${direction}`;
}

function buildSignalHeadline(signal) {
  const asset = formatSignalAsset(signal);
  const direction = formatSignalDirection(signal);
  const typeLabel =
    signal.analysis?.messageType === "strategy"
      ? "策略"
      : signal.analysis?.messageType === "analysis"
        ? "分析"
        : signal.analysis?.messageType === "watchlist"
          ? "观察"
          : signal.sourceType === "news"
            ? "快讯"
            : "提醒";

  return `# ${escapeMarkdown(asset)} ${escapeMarkdown(direction)}｜${escapeMarkdown(typeLabel)}`;
}

function pickSignalTemplate(signal) {
  const direction = String(signal.analysis?.direction || signal.tradeIdea?.side || "").toLowerCase();
  if (direction === "sell") {
    return "red";
  }
  if (direction === "buy") {
    return "green";
  }
  return signal.sourceType === "analyst" ? "blue" : "turquoise";
}

function buildProtectionLine(signal) {
  const protectionPlan = signal.tradeIdea?.protectionPlan || {};
  const stopLoss = protectionPlan.stopLoss ?? signal.analysis?.stopLoss;
  const takeProfits =
    protectionPlan.takeProfits ||
    (Array.isArray(signal.analysis?.takeProfits) ? signal.analysis.takeProfits : []);
  const riskReward = protectionPlan.riskRewardTarget;
  const parts = [];
  if (stopLoss) {
    parts.push(`止损 ${stopLoss}`);
  }
  if (takeProfits?.length) {
    parts.push(`止盈 ${takeProfits.join(" / ")}`);
  }
  if (riskReward) {
    parts.push(`盈亏比 ${riskReward}`);
  }
  return parts.join(" ｜ ");
}

function buildSignalContent(signal, options = {}) {
  const needsDecision = signal.executionStatus === "pending_approval";
  const displaySource = getDisplaySource(signal, options);
  const keyTakeaway =
    signal.tradeIdea?.summary ||
    signal.analysis?.normalizedSummary?.split("\n").find(Boolean) ||
    getReadableExecutionReason(signal) ||
    "这是一条新的结构化交易提醒。";
  const protectionLine = buildProtectionLine(signal);

  const summaryLines = [
    `- **来源分组**：${escapeMarkdown(displaySource)}`,
    `- **类型**：${escapeMarkdown(formatSignalType(signal.sourceType))}`,
    `- **当前状态**：${escapeMarkdown(formatExecutionStatus(signal.executionStatus))}`,
    `- **评分**：${escapeMarkdown(Number(signal.score || 0).toFixed(2))}`,
    `- **命中策略**：${escapeMarkdown(signal.matchedPlaybookIds?.join("、") || "无")}`,
    `- **AI 建议**：${escapeMarkdown(signal.tradeIdea?.summary || "暂未形成可执行订单")}`,
  ];

  if (protectionLine) {
    summaryLines.push(`- **保护计划**：${escapeMarkdown(protectionLine)}`);
  }
  summaryLines.push(`- **说明**：${escapeMarkdown(getReadableExecutionReason(signal))}`);

  const sections = [
    buildSignalHeadline(signal),
    "",
    "## 重点结论",
    `**${escapeMarkdown(keyTakeaway)}**`,
    "",
    "## 策略总览",
    ...summaryLines,
  ];

  if (signal.analysis?.normalizedSummary) {
    const structuredLines = String(signal.analysis.normalizedSummary)
      .split("\n")
      .filter(Boolean)
      .map((line) => `- ${escapeMarkdown(line)}`);
    sections.push("", "## 结构化分析", ...structuredLines);
  }

  const body = getDisplayText(signal);
  if (body) {
    sections.push(
      "",
      "## 转发正文",
      `> ${escapeMarkdown(truncateText(body, 2200)).replaceAll("\n", "\n> ")}`,
    );
  }

  if (needsDecision) {
    sections.push("", "## 操作建议", "_点击下方按钮进入中文决策面板，再决定是否跟单。_");
  }

  return sections.join("\n");
}

function buildExecutionContent(signal, result, options = {}) {
  const displaySource = getDisplaySource(signal, options);
  const details = [
    `# ${escapeMarkdown(formatSignalAsset(signal))} 执行结果`,
    "",
    `- **信号 ID**：${escapeMarkdown(signal.id)}`,
    `- **来源分组**：${escapeMarkdown(displaySource)}`,
    `- **执行状态**：${escapeMarkdown(formatResultStatus(result.status))}`,
    `- **结果说明**：${escapeMarkdown(result.message || "无")}`,
  ];

  if (result.orderId) {
    details.push(`- **订单号**：${escapeMarkdown(result.orderId)}`);
  }
  if (result.avgPrice) {
    details.push(`- **成交均价**：${escapeMarkdown(result.avgPrice)}`);
  }
  if (result.filledSize) {
    details.push(`- **成交数量**：${escapeMarkdown(result.filledSize)}`);
  }

  return details.join("\n");
}

function buildLegacyPayload({ title, content, buttonUrl = "", buttonText = "" }) {
  return {
    title,
    content,
    button_url: buttonUrl,
    button_text: buttonText,
  };
}

function buildBotCardPayload({ title, content, buttons = [], template = "blue" }) {
  const elements = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: truncateText(content, 3500),
      },
    },
  ];

  const visibleButtons = buttons.filter((button) => button?.url && button?.text);
  if (visibleButtons.length) {
    elements.push({
      tag: "action",
      actions: visibleButtons.map((button, index) => ({
        tag: "button",
        text: {
          tag: "plain_text",
          content: button.text,
        },
        type: button.type || (index === 0 ? "primary" : "default"),
        url: button.url,
      })),
    });
  }

  return {
    msg_type: "interactive",
    card: {
      config: {
        wide_screen_mode: true,
      },
      header: {
        template,
        title: {
          tag: "plain_text",
          content: title,
        },
      },
      elements,
    },
  };
}

export class FeishuNotifier {
  constructor({ webhookUrl, publicBaseUrl }) {
    this.defaultWebhookUrl = webhookUrl;
    this.publicBaseUrl = publicBaseUrl;
  }

  resolveWebhookUrl(overrideWebhookUrl = "") {
    return String(overrideWebhookUrl || this.defaultWebhookUrl || "").trim();
  }

  isConfigured(overrideWebhookUrl = "") {
    return Boolean(this.resolveWebhookUrl(overrideWebhookUrl));
  }

  isBotWebhook(webhookUrl) {
    return /\/open-apis\/bot\/v2\/hook\//i.test(String(webhookUrl || ""));
  }

  buildReviewUrl(signalId, approvalToken) {
    if (!this.publicBaseUrl) {
      return "";
    }
    return `${this.publicBaseUrl.replace(/\/$/, "")}/signals/${signalId}?token=${approvalToken}`;
  }

  buildApproveUrl(signalId, approvalToken) {
    if (!this.publicBaseUrl) {
      return "";
    }
    return `${this.publicBaseUrl.replace(/\/$/, "")}/signals/${signalId}/approve?token=${approvalToken}`;
  }

  buildRejectUrl(signalId, approvalToken) {
    if (!this.publicBaseUrl) {
      return "";
    }
    return `${this.publicBaseUrl.replace(/\/$/, "")}/signals/${signalId}/reject?token=${approvalToken}`;
  }

  async postWebhook(payload, overrideWebhookUrl = "") {
    const webhookUrl = this.resolveWebhookUrl(overrideWebhookUrl);
    if (!webhookUrl) {
      throw new Error("Feishu webhook is not configured");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Feishu webhook failed: ${response.status} ${details}`.trim());
    }

    const data = await response.json().catch(() => null);
    if (data && typeof data.code === "number" && data.code !== 0) {
      throw new Error(`Feishu webhook rejected request: ${data.msg || data.code}`);
    }

    return data;
  }

  async sendSignalCard(signal, approvalToken, options = {}) {
    if (!this.isConfigured(options.webhookUrl)) {
      return;
    }

    const webhookUrl = this.resolveWebhookUrl(options.webhookUrl);
    const needsDecision = signal.executionStatus === "pending_approval";
    const reviewUrl = this.buildReviewUrl(signal.id, approvalToken);
    const approveUrl = this.buildApproveUrl(signal.id, approvalToken);
    const rejectUrl = this.buildRejectUrl(signal.id, approvalToken);
    const displaySource = getDisplaySource(signal, options);
    const title = buildSignalTitle(signal, displaySource);
    const content = buildSignalContent(signal, options);

    if (this.isBotWebhook(webhookUrl)) {
      const buttons = needsDecision
        ? [
            { text: "打开决策面板", url: reviewUrl, type: "primary" },
            { text: "快速跟单", url: approveUrl, type: "primary" },
            { text: "忽略这单", url: rejectUrl, type: "default" },
          ]
        : reviewUrl
          ? [{ text: "查看详情", url: reviewUrl, type: "primary" }]
          : [];

      await this.postWebhook(
        buildBotCardPayload({
          title,
          content,
          buttons,
          template: pickSignalTemplate(signal),
        }),
        webhookUrl,
      );
      return;
    }

    await this.postWebhook(
      buildLegacyPayload({
        title,
        content,
        buttonUrl: reviewUrl,
        buttonText: needsDecision ? "打开决策面板" : "查看详情",
      }),
      webhookUrl,
    );
  }

  async sendExecutionResult(signal, result, options = {}) {
    if (!this.isConfigured(options.webhookUrl)) {
      return;
    }

    const webhookUrl = this.resolveWebhookUrl(options.webhookUrl);
    const displaySource = getDisplaySource(signal, options);
    const title =
      result.status === "failed"
        ? `${displaySource} 执行失败`
        : `${displaySource} 执行结果`;
    const content = buildExecutionContent(signal, result, options);

    if (this.isBotWebhook(webhookUrl)) {
      await this.postWebhook(
        buildBotCardPayload({
          title,
          content,
          buttons: [],
          template: result.status === "failed" ? "red" : "turquoise",
        }),
        webhookUrl,
      );
      return;
    }

    await this.postWebhook(
      buildLegacyPayload({
        title,
        content,
      }),
      webhookUrl,
    );
  }
}
