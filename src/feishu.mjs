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
  return signal.displayText || signal.text || "";
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

  async postFlowPayload(payload, overrideWebhookUrl = "") {
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
  }

  async sendSignalCard(signal, approvalToken, options = {}) {
    if (!this.isConfigured(options.webhookUrl)) {
      return;
    }

    const reviewUrl = this.buildReviewUrl(signal.id, approvalToken);
    const approveUrl = this.buildApproveUrl(signal.id, approvalToken);
    const rejectUrl = this.buildRejectUrl(signal.id, approvalToken);
    const needsDecision = signal.executionStatus === "pending_approval";
    const displaySource = getDisplaySource(signal, options);
    const displayText = getDisplayText(signal);
    const analystPrivacyHint =
      signal.sourceType === "analyst" ? "已自动隐藏原始链接、联系方式和用户名" : "";

    const contentLines = [
      `来源分组：${displaySource}`,
      `类型：${formatSignalType(signal.sourceType)}`,
      `评分：${signal.score.toFixed(2)}`,
      `当前状态：${formatExecutionStatus(signal.executionStatus)}`,
      `命中策略：${signal.matchedPlaybookIds.join("、") || "无"}`,
      `交易建议：${signal.tradeIdea ? signal.tradeIdea.summary : "暂无结构化交易建议"}`,
    ];

    if (signal.executionReason) {
      contentLines.push(`说明：${signal.executionReason}`);
    }

    if (analystPrivacyHint) {
      contentLines.push(`隐私处理：${analystPrivacyHint}`);
    }

    contentLines.push("", displayText);

    if (needsDecision) {
      contentLines.push("", "操作说明：点击下方按钮进入中文确认页，再决定是否跟单。");
      if (approveUrl) {
        contentLines.push(`快速跟单链接：${approveUrl}`);
      }
      if (rejectUrl) {
        contentLines.push(`忽略链接：${rejectUrl}`);
      }
    } else if (reviewUrl) {
      contentLines.push("", `详情页：${reviewUrl}`);
    }

    await this.postFlowPayload(
      {
        title: signal.sourceType === "analyst" ? `${displaySource} 策略提醒` : "新闻交易提醒",
        content: contentLines.join("\n"),
        button_url: needsDecision ? reviewUrl : "",
        button_text: needsDecision ? "打开决策面板" : "",
      },
      options.webhookUrl,
    );
  }

  async sendExecutionResult(signal, result, options = {}) {
    if (!this.isConfigured(options.webhookUrl)) {
      return;
    }

    const displaySource = getDisplaySource(signal, options);

    await this.postFlowPayload(
      {
        title: "交易结果通知",
        content: [
          `信号 ID：${signal.id}`,
          `来源分组：${displaySource}`,
          `执行状态：${formatResultStatus(result.status)}`,
          `结果说明：${result.message}`,
        ].join("\n"),
        button_url: "",
        button_text: "",
      },
      options.webhookUrl,
    );
  }
}
