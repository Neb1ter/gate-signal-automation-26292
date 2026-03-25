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
  return `${value.slice(0, Math.max(0, limit - 10))}\n\n[内容已截断]`;
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("`", "\\`");
}

function buildSignalContent(signal, options = {}) {
  const needsDecision = signal.executionStatus === "pending_approval";
  const displaySource = getDisplaySource(signal, options);
  const analystPrivacyHint =
    signal.sourceType === "analyst" ? "已自动隐藏原始链接、联系方式和用户名" : "";

  const lines = [
    `来源分组：${displaySource}`,
    `类型：${formatSignalType(signal.sourceType)}`,
    `评分：${Number(signal.score || 0).toFixed(2)}`,
    `当前状态：${formatExecutionStatus(signal.executionStatus)}`,
    `命中策略：${signal.matchedPlaybookIds?.join("、") || "无"}`,
    `交易建议：${signal.tradeIdea?.summary || "暂无结构化交易建议"}`,
  ];

  if (signal.executionReason) {
    lines.push(`说明：${signal.executionReason}`);
  }

  if (analystPrivacyHint) {
    lines.push(`隐私处理：${analystPrivacyHint}`);
  }

  const body = getDisplayText(signal);
  if (body) {
    lines.push("", truncateText(body, 2500));
  }

  if (needsDecision) {
    lines.push("", "操作说明：点击下方按钮进入中文决策页，再决定是否跟单。");
  }

  return lines.join("\n");
}

function buildExecutionContent(signal, result, options = {}) {
  const displaySource = getDisplaySource(signal, options);
  return [
    `信号 ID：${signal.id}`,
    `来源分组：${displaySource}`,
    `执行状态：${formatResultStatus(result.status)}`,
    `结果说明：${result.message || "无"}`,
  ].join("\n");
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
        content: truncateText(escapeMarkdown(content), 3500),
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
    const title =
      signal.sourceType === "analyst" ? `${displaySource} 策略提醒` : "新闻交易提醒";
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
          template: signal.sourceType === "analyst" ? "blue" : "green",
        }),
        webhookUrl,
      );
      return;
    }

    await this.postWebhook(
      buildLegacyPayload({
        title,
        content,
        buttonUrl: needsDecision ? reviewUrl : "",
        buttonText: needsDecision ? "打开决策面板" : "",
      }),
      webhookUrl,
    );
  }

  async sendExecutionResult(signal, result, options = {}) {
    if (!this.isConfigured(options.webhookUrl)) {
      return;
    }

    const webhookUrl = this.resolveWebhookUrl(options.webhookUrl);
    const title = "交易结果通知";
    const content = buildExecutionContent(signal, result, options);
    const reviewUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, "")}/signals/${signal.id}`
      : "";

    if (this.isBotWebhook(webhookUrl)) {
      await this.postWebhook(
        buildBotCardPayload({
          title,
          content,
          buttons: reviewUrl ? [{ text: "查看信号详情", url: reviewUrl, type: "primary" }] : [],
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
