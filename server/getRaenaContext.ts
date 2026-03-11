/**
 * getRaenaContext.ts
 * Helper que busca leads reais do Kommo e formata como contexto estruturado
 * para a agente Raena. Cache de 60s para evitar excesso de chamadas à API.
 */

import { kommoGet } from "./kommo";
import { getDb } from "./db";
import { kommoLeads } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

// ─── Cache ────────────────────────────────────────────────────────────────────
let cachedContext: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 60 segundos

export function invalidateRaenaContextCache() {
  cachedContext = null;
  cacheExpiry = 0;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface KommoLead {
  id: number;
  name: string;
  price: number;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  updated_at: number;
  responsible_user_id: number;
  contacts?: Array<{ name: string; id: number }>;
  tags?: Array<{ name: string }>;
}

interface PipelineStage {
  id: number;
  name: string;
  order: number;
}

// ─── Buscar pipelines e etapas ────────────────────────────────────────────────
async function fetchPipelineStages(): Promise<Map<number, string>> {
  const stageMap = new Map<number, string>();
  try {
    const data = await kommoGet("/leads/pipelines?with=statuses");
    const pipelines = data?._embedded?.pipelines ?? [];
    for (const pipeline of pipelines) {
      const statuses: PipelineStage[] = pipeline._embedded?.statuses ?? [];
      for (const status of statuses) {
        stageMap.set(status.id, `${pipeline.name} → ${status.name}`);
      }
    }
  } catch {
    // Se falhar, retorna mapa vazio — etapas ficarão como IDs
  }
  return stageMap;
}

// ─── Buscar leads com contatos e notas ────────────────────────────────────────
async function fetchLeadsWithContext(limit = 30): Promise<KommoLead[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    page: "1",
    order: "updated_at",
    with: "contacts,tags",
  });
  const data = await kommoGet(`/leads?${params.toString()}`);
  return data?._embedded?.leads ?? [];
}

// ─── Buscar notas recentes de um lead ─────────────────────────────────────────
async function fetchLeadNotes(leadId: number): Promise<string[]> {
  try {
    const data = await kommoGet(`/leads/${leadId}/notes?limit=5&order=created_at`);
    const notes = data?._embedded?.notes ?? [];
    return notes
      .filter((n: any) => n.note_type === "common" || n.note_type === "amocrm_widget_message")
      .map((n: any) => n.params?.text ?? n.params?.message ?? "")
      .filter(Boolean)
      .slice(-3);
  } catch {
    return [];
  }
}

// ─── Buscar leads do banco local (fallback) ───────────────────────────────────
async function fetchLeadsFromDb(limit = 20): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "Banco de dados não disponível.";

    const rows = await db
      .select()
      .from(kommoLeads)
      .orderBy(desc(kommoLeads.updatedAt))
      .limit(limit);

    if (!rows.length) return "Nenhum lead encontrado no banco local.";

    // Agrupar por status/etapa
    const byEtapa: Record<string, typeof rows> = {};
    for (const row of rows) {
      const etapa = row.etapa ?? row.status ?? "Sem etapa";
      if (!byEtapa[etapa]) byEtapa[etapa] = [];
      byEtapa[etapa].push(row);
    }

    const lines: string[] = [
      `LEADS NO BANCO LOCAL (${rows.length} leads):`,
      "",
    ];

    for (const [etapa, leads] of Object.entries(byEtapa)) {
      lines.push(`## ${etapa} (${leads.length} leads)`);
      for (const lead of leads.slice(0, 5)) {
        const valor = lead.valorLead ? `R$${Number(lead.valorLead).toLocaleString("pt-BR")}` : "Sem valor";
        const temp = lead.temperatura ? ` [${lead.temperatura.toUpperCase()}]` : "";
        lines.push(`  - ${lead.nome || "Sem nome"}${temp} | ${valor} | Resp: ${lead.responsavel ?? "N/A"}`);
      }
      if (leads.length > 5) lines.push(`  ... e mais ${leads.length - 5} leads`);
      lines.push("");
    }

    // Estatísticas
    const total = rows.length;
    const valorTotal = rows.reduce((sum, r) => sum + (Number(r.valorLead) || 0), 0);
    const quentes = rows.filter((r) => r.temperatura === "quente").length;
    const mornos = rows.filter((r) => r.temperatura === "morno").length;
    const frios = rows.filter((r) => r.temperatura === "frio").length;

    lines.push("## RESUMO DO PIPELINE");
    lines.push(`Total de leads: ${total}`);
    lines.push(`Valor total em pipeline: R$${valorTotal.toLocaleString("pt-BR")}`);
    lines.push(`Temperatura: ${quentes} quentes | ${mornos} mornos | ${frios} frios`);

    return lines.join("\n");
  } catch (err: any) {
    return `Erro ao buscar leads do banco: ${err.message}`;
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────
export async function getRaenaContext(): Promise<{
  context: string;
  source: "kommo_api" | "db_cache" | "unavailable";
  leadCount: number;
  pipelineStats: {
    total: number;
    valorTotal: number;
    byStage: Record<string, number>;
  };
}> {
  // Retornar cache se ainda válido
  if (cachedContext && Date.now() < cacheExpiry) {
    // Parse stats do cache (simplificado)
    const match = cachedContext.match(/Total de leads: (\d+)/);
    const valorMatch = cachedContext.match(/Valor total.*?R\$([\d.,]+)/);
    const count = match ? parseInt(match[1]) : 0;
    return {
      context: cachedContext,
      source: "kommo_api",
      leadCount: count,
      pipelineStats: {
        total: count,
        valorTotal: valorMatch ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", ".")) : 0,
        byStage: {},
      },
    };
  }

  // Tentar buscar da API do Kommo
  try {
    const [leads, stageMap] = await Promise.all([
      fetchLeadsWithContext(40),
      fetchPipelineStages(),
    ]);

    if (!leads.length) {
      // Fallback para banco local
      const dbContext = await fetchLeadsFromDb();
      return {
        context: dbContext,
        source: "db_cache",
        leadCount: 0,
        pipelineStats: { total: 0, valorTotal: 0, byStage: {} },
      };
    }

    // Buscar notas dos 5 leads mais recentes (para não sobrecarregar a API)
    const topLeads = leads.slice(0, 5);
    const notesMap = new Map<number, string[]>();
    await Promise.all(
      topLeads.map(async (lead) => {
        const notes = await fetchLeadNotes(lead.id);
        notesMap.set(lead.id, notes);
      })
    );

    // Agrupar por etapa
    const byStage: Record<string, KommoLead[]> = {};
    for (const lead of leads) {
      const stageName = stageMap.get(lead.status_id) ?? `Etapa ${lead.status_id}`;
      if (!byStage[stageName]) byStage[stageName] = [];
      byStage[stageName].push(lead);
    }

    // Montar contexto formatado
    const lines: string[] = [
      `PIPELINE KOMMO EM TEMPO REAL (${leads.length} leads ativos):`,
      `Atualizado em: ${new Date().toLocaleString("pt-BR")}`,
      "",
    ];

    let valorTotal = 0;
    const byStageCount: Record<string, number> = {};

    for (const [stage, stageLeads] of Object.entries(byStage)) {
      const stageValue = stageLeads.reduce((sum, l) => sum + (l.price || 0), 0);
      valorTotal += stageValue;
      byStageCount[stage] = stageLeads.length;

      lines.push(`## ${stage} (${stageLeads.length} leads | R$${stageValue.toLocaleString("pt-BR")})`);

      for (const lead of stageLeads.slice(0, 6)) {
        const valor = lead.price ? `R$${lead.price.toLocaleString("pt-BR")}` : "Sem valor";
        const tags = lead.tags?.map((t) => t.name).join(", ") || "";
        const contacts = lead.contacts?.map((c) => c.name).join(", ") || "Sem contato";
        const notes = notesMap.get(lead.id);
        const notesStr = notes?.length ? ` | Notas: "${notes[notes.length - 1]?.slice(0, 80)}"` : "";
        const tagsStr = tags ? ` | Tags: ${tags}` : "";
        const updatedDays = Math.floor((Date.now() - lead.updated_at * 1000) / 86400000);
        const staleness = updatedDays > 7 ? ` ⚠️ ${updatedDays}d sem atualização` : "";

        lines.push(`  - [${lead.id}] ${lead.name || "Sem nome"} | ${valor} | ${contacts}${tagsStr}${notesStr}${staleness}`);
      }

      if (stageLeads.length > 6) {
        lines.push(`  ... e mais ${stageLeads.length - 6} leads nesta etapa`);
      }
      lines.push("");
    }

    // Resumo executivo
    const leadsParados = leads.filter((l) => {
      const days = Math.floor((Date.now() - l.updated_at * 1000) / 86400000);
      return days > 7;
    }).length;

    const leadsHoje = leads.filter((l) => {
      const days = Math.floor((Date.now() - l.updated_at * 1000) / 86400000);
      return days === 0;
    }).length;

    lines.push("## RESUMO EXECUTIVO DO PIPELINE");
    lines.push(`Total de leads ativos: ${leads.length}`);
    lines.push(`Valor total em pipeline: R$${valorTotal.toLocaleString("pt-BR")}`);
    lines.push(`Leads atualizados hoje: ${leadsHoje}`);
    lines.push(`Leads parados há +7 dias: ${leadsParados} ⚠️`);
    lines.push(`Etapas com leads: ${Object.keys(byStage).length}`);

    const context = lines.join("\n");

    // Salvar no cache
    cachedContext = context;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    return {
      context,
      source: "kommo_api",
      leadCount: leads.length,
      pipelineStats: {
        total: leads.length,
        valorTotal,
        byStage: byStageCount,
      },
    };
  } catch (err: any) {
    // Se Kommo não está conectado, usar banco local como fallback
    if (err.message?.includes("not connected") || err.message?.includes("Kommo not connected")) {
      const dbContext = await fetchLeadsFromDb();
      return {
        context: dbContext,
        source: "db_cache",
        leadCount: 0,
        pipelineStats: { total: 0, valorTotal: 0, byStage: {} },
      };
    }

    return {
      context: `Kommo temporariamente indisponível: ${err.message}. Analise com base no histórico conhecido.`,
      source: "unavailable",
      leadCount: 0,
      pipelineStats: { total: 0, valorTotal: 0, byStage: {} },
    };
  }
}
