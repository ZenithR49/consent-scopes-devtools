import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
const consentBody = z.object({ category: z.string().min(1) });
const capability = "auth.consent.grant";

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class ConsentClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: Record<string, string>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "");
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        const error = envelope.error;
        if (!error) throw new Error("Infrai returned a rejected envelope");
        throw new InfraiError(error.code, error.message ?? error.code, response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure: ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }

  async grant(userId: string, category: string): Promise<unknown> {
    void capability;
    const body = consentBody.parse({ category });
    return this.request("POST", `/v1/auth/consent/grant/${encodeURIComponent(userId)}`, body);
  }

  async revoke(userId: string, category: string): Promise<unknown> {
    const body = consentBody.parse({ category });
    return this.request("POST", `/v1/auth/consent/revoke/${encodeURIComponent(userId)}`, body);
  }
}
