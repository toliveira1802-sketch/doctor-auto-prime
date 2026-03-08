import type { Express, Request, Response } from "express";
import { exchangeKommoCode, buildKommoAuthUrl, getKommoToken } from "./kommo";
import { eq } from "drizzle-orm";
import { kommoLeads, systemLogs } from "../drizzle/schema";
import { getDb } from "./db";

async function writeLog(nivel: "info" | "warn" | "error" | "success", fonte: string, mensagem: string, detalhes?: object) {
  try {
    const db = await getDb();
    if (!db) return;
    const now = Date.now();
    await db.insert(systemLogs).values({
      timestamp: now,
      nivel,
      fonte,
      mensagem,
      detalhes: detalhes ? JSON.stringify(detalhes).slice(0, 5000) : null,
      createdAt: now,
    });
  } catch (e) {
    console.error("[writeLog] Failed to write log:", e);
  }
}

export function registerKommoRoutes(app: Express) {
  // GET /api/kommo/auth-url — returns the OAuth URL for the frontend to redirect to
  app.get("/api/kommo/auth-url", (req: Request, res: Response) => {
    const origin = (req.query.origin as string) || "http://localhost:3000";
    const redirectUri = `${origin}/api/kommo/callback`;
    const url = buildKommoAuthUrl(redirectUri);
    res.json({ url, redirectUri });
  });

  // GET /api/kommo/callback — handles the OAuth code exchange
  app.get("/api/kommo/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const origin = req.headers.origin || req.headers.referer || "http://localhost:3000";
    // Extract base origin (protocol + host)
    let baseOrigin: string;
    try {
      const url = new URL(origin);
      baseOrigin = url.origin;
    } catch {
      baseOrigin = "http://localhost:3000";
    }
    const redirectUri = `${baseOrigin}/api/kommo/callback`;

    if (!code) {
      res.redirect("/#/admin/integracoes?kommo=error&msg=no_code");
      return;
    }

    try {
      await exchangeKommoCode(code, redirectUri);
      res.redirect("/#/admin/integracoes?kommo=success");
    } catch (error: any) {
      console.error("[Kommo] OAuth callback failed:", error.message);
      res.redirect(`/#/admin/integracoes?kommo=error&msg=${encodeURIComponent(error.message)}`);
    }
  });

  // GET /api/kommo/status — check if Kommo is connected
  app.get("/api/kommo/status", async (_req: Request, res: Response) => {
    try {
      const token = await getKommoToken();
      res.json({ connected: !!token });
    } catch {
      res.json({ connected: false });
    }
  });

  // ── Webhook endpoint ───────────────────────────────────────────────────────
  // POST /api/kommo/webhook — recebe eventos do Kommo em tempo real
  app.post("/api/kommo/webhook", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      console.log("[Kommo Webhook] Received:", JSON.stringify(body).slice(0, 500));

      const leadsAdd: any[]    = extractLeads(body, "leads[add]")    || extractLeads(body, "leads.add")    || [];
      const leadsUpdate: any[] = extractLeads(body, "leads[update]") || extractLeads(body, "leads.update") || [];
      const leadsStatus: any[] = extractLeads(body, "leads[status]") || extractLeads(body, "leads.status") || [];

      const allLeads = [...leadsAdd, ...leadsUpdate, ...leadsStatus];

      if (allLeads.length === 0) {
        await writeLog("warn", "Kommo Webhook", "Payload recebido sem leads identificados", { bodyKeys: Object.keys(body) });
      }

      for (const lead of allLeads) {
        await upsertLead(lead, body);
      }

      if (allLeads.length > 0) {
        await writeLog("success", "Kommo Webhook", `${allLeads.length} lead(s) processado(s) com sucesso`, {
          leads: allLeads.map((l: any) => ({ id: l.id, nome: l.name, etapa: l.status_name }))
        });
      }

      res.json({ ok: true, processed: allLeads.length });
    } catch (err: any) {
      console.error("[Kommo Webhook] Error:", err.message);
      await writeLog("error", "Kommo Webhook", `Erro ao processar webhook: ${err.message}`, { stack: err.stack?.slice(0, 1000) });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/kommo/webhook — health check
  app.get("/api/kommo/webhook", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "Doctor Auto Prime - Kommo Webhook" });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractLeads(body: any, key: string): any[] | null {
  if (!body) return null;
  if (body[key] && Array.isArray(body[key])) return body[key];
  const parts = key.replace(/\[/g, ".").replace(/\]/g, "").split(".");
  let cur = body;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return Array.isArray(cur) ? cur : null;
}

function getCustomField(lead: any, fieldName: string): string | null {
  const fields: any[] = lead.custom_fields_values || lead.custom_fields || [];
  for (const f of fields) {
    const name = (f.field_name || f.name || "").toLowerCase();
    if (name.includes(fieldName.toLowerCase())) {
      const vals = f.values || f.value;
      if (Array.isArray(vals)) return vals[0]?.value ?? null;
      return vals ?? null;
    }
  }
  return null;
}

async function upsertLead(lead: any, rawBody: any) {
  const kommoLeadId = Number(lead.id);
  if (!kommoLeadId || isNaN(kommoLeadId)) return;

  const nome      = lead.name || lead.nome || null;
  const status    = lead.status_id ? String(lead.status_id) : (lead.status || "novo");
  const etapa     = lead.status_name || null;
  const etapaId   = lead.status_id ? Number(lead.status_id) : null;
  const pipeline  = lead.pipeline_id ? String(lead.pipeline_id) : null;
  const valorLead = lead.price ? String(lead.price) : "0";

  let responsavel: string | null = null;
  const embedded = lead._embedded || {};
  if (embedded.users && embedded.users[0]) {
    responsavel = embedded.users[0].name || null;
  }

  let telefone: string | null = null;
  if (embedded.contacts && embedded.contacts[0]) {
    const contact = embedded.contacts[0];
    const phoneField = (contact.custom_fields_values || []).find((f: any) =>
      (f.field_code || "").includes("PHONE") || (f.field_name || "").toLowerCase().includes("telefone")
    );
    if (phoneField?.values?.[0]?.value) telefone = phoneField.values[0].value;
  }

  const placa       = getCustomField(lead, "placa");
  const marca       = getCustomField(lead, "marca");
  const modelo      = getCustomField(lead, "modelo");
  const origemCanal = getCustomField(lead, "origem") || getCustomField(lead, "canal");
  const tipoServico = getCustomField(lead, "servico") || getCustomField(lead, "tipo");

  const now = new Date();

  const database = await getDb();
  if (!database) return;
  const existing = await database
    .select({ id: kommoLeads.id })
    .from(kommoLeads)
    .where(eq(kommoLeads.kommoLeadId, kommoLeadId))
    .limit(1);

  const payload = {
    kommoLeadId, nome, status, etapa, etapaId, pipeline, responsavel,
    telefone, placa, marca, modelo, origemCanal, tipoServico, valorLead,
    ultimaInteracao: now,
    webhookPayload: JSON.stringify(rawBody).slice(0, 5000),
    updatedAt: now,
  };

  if (existing.length > 0) {
    await database.update(kommoLeads).set(payload).where(eq(kommoLeads.kommoLeadId, kommoLeadId));
    console.log(`[Kommo Webhook] Updated lead #${kommoLeadId} — ${nome}`);
  } else {
    await database.insert(kommoLeads).values({ ...payload, createdAt: now });
    console.log(`[Kommo Webhook] Inserted lead #${kommoLeadId} — ${nome}`);
  }
}
