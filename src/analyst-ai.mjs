function buildUrl(baseUrl) {
  const trimmed = String(baseUrl || "").replace(/\/$/, "");
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function safeJsonParse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {}

  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];
}

function normalizeDirection(value) {
  const normalized = String(value || "").toLowerCase();
  if (["buy", "long", "bullish"].includes(normalized)) {
    return "buy";
  }
  if (["sell", "short", "bearish", "reduce"].includes(normalized)) {
    return "sell";
  }
  return "";
}

export class AnalystAiReviewer {
  constructor(config = {}) {
    this.enabled = Boolean(config.enabled);
    this.apiKey = config.apiKey || "";
    this.baseUrl = buildUrl(config.baseUrl);
    this.model = config.model || "";
    this.timeoutMs = Number(config.timeoutMs || 10000);
  }

  isConfigured() {
    return Boolean(this.enabled && this.apiKey && this.baseUrl && this.model);
  }

  async review(signal) {
    if (!this.isConfigured() || signal?.sourceType !== "analyst") {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = {
      model: this.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是交易信号结构化助手。请把分析师原文整理为严格 JSON，只输出 JSON。不要编造缺失信息。direction 只能是 buy、sell 或空字符串。messageType 只能是 strategy、analysis、watchlist、brief。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "从分析师文案中提炼结构化交易要素，并给出文案规范建议",
            expectedFields: [
              "messageType",
              "asset",
              "symbol",
              "direction",
              "directionLabel",
              "entryText",
              "entryLow",
              "entryHigh",
              "stopLoss",
              "takeProfits",
              "leverage",
              "timeframe",
              "confidence",
              "actionable",
              "complianceComment",
              "riskFlags",
            ],
            text: signal.text,
          }),
        },
      ],
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI reviewer request failed: ${response.status}`);
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content || "";
      const parsed = safeJsonParse(content);
      if (!parsed) {
        return null;
      }

      return {
        parser: "ai-review",
        messageType: String(parsed.messageType || ""),
        asset: String(parsed.asset || "").toUpperCase(),
        symbol: String(parsed.symbol || "").replace("/", "_").toUpperCase(),
        direction: normalizeDirection(parsed.direction),
        directionLabel: String(parsed.directionLabel || ""),
        entryText: String(parsed.entryText || ""),
        entryLow: parsed.entryLow ?? null,
        entryHigh: parsed.entryHigh ?? null,
        stopLoss: parsed.stopLoss ?? null,
        takeProfits: normalizeArray(parsed.takeProfits),
        leverage: String(parsed.leverage || ""),
        timeframe: String(parsed.timeframe || ""),
        confidence: String(parsed.confidence || ""),
        actionable: Boolean(parsed.actionable),
        complianceComment: String(parsed.complianceComment || ""),
        riskFlags: normalizeArray(parsed.riskFlags),
      };
    } catch (error) {
      return {
        parser: "ai-review",
        complianceComment: `AI 规范审阅未完成：${error.name === "AbortError" ? "请求超时" : error.message}`,
        riskFlags: [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
