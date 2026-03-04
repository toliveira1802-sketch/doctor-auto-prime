/**
 * Doctor Auto Prime — Agente de IA para Kommo
 *
 * Dois agentes:
 * 1. Atendimento: qualifica leads novos no WhatsApp (coleta dados, classifica serviço, detecta temperatura)
 * 2. Reativação: varre clientes inativos 90d+ e leads esfriados, envia mensagem personalizada
 *
 * Regras fixas:
 * - NUNCA passa preço ou negocia
 * - NUNCA menciona concorrentes
 * - Sempre faz handoff para consultor quando lead pede valor
 */

import { invokeLLM } from "./_core/llm";
import { kommoGet, kommoPost, kommoPatch } from "./kommo";
import { getDb } from "./db";
import { clientes, ordensServico } from "../drizzle/schema";
import { lt, and, isNotNull, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadTemperature = "quente" | "morno" | "frio";
type ServiceType = "rapido" | "medio" | "projeto" | "indefinido";

interface QualificationResult {
  temperature: LeadTemperature;
  serviceType: ServiceType;
  collectedData: {
    nome?: string;
    placa?: string;
    sintoma?: string;
    veiculo?: string;
  };
  nextAction: "schedule" | "handoff_consultant" | "continue_conversation";
  responseMessage: string;
}

// ─── Agente 1: Qualificação de Leads ─────────────────────────────────────────

export async function qualifyLead(
  leadId: number,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  latestMessage: string
): Promise<QualificationResult> {

  const systemPrompt = `Você é a Ana, assistente virtual da Doctor Auto Prime — oficina especializada em Volkswagen e Audi, com foco em remap e performance.

REGRAS ABSOLUTAS:
- NUNCA passe preços, valores ou faça negociação. Se perguntarem sobre preço, diga: "Vou chamar nosso consultor especialista para te passar os valores com precisão."
- NUNCA mencione concorrentes
- Seja direta, simpática e profissional
- Use linguagem natural, não robótica
- Máximo 3 perguntas por mensagem

SEU OBJETIVO é coletar:
1. Nome do cliente
2. Placa ou modelo do veículo
3. O que está acontecendo com o carro (sintoma ou serviço desejado)

CLASSIFICAÇÃO DE SERVIÇO:
- Rápido (até 2h): troca de óleo, revisão básica, diagnóstico VCDS, alinhamento
- Médio (2-8h): freios, suspensão, embreagem, remap Stage 1
- Projeto (8h+): motor, câmbio, turbo, remap Stage 2/3, preparação de pista

TEMPERATURA DO LEAD:
- Quente: quer agendar agora, tem urgência, já sabe o que quer
- Morno: demonstrou interesse mas está pesquisando
- Frio: só curiosidade, sem urgência

Responda em JSON com esta estrutura exata:
{
  "temperature": "quente|morno|frio",
  "serviceType": "rapido|medio|projeto|indefinido",
  "collectedData": {
    "nome": "string ou null",
    "placa": "string ou null",
    "sintoma": "string ou null",
    "veiculo": "string ou null"
  },
  "nextAction": "schedule|handoff_consultant|continue_conversation",
  "responseMessage": "mensagem para enviar ao cliente"
}

nextAction:
- "schedule": lead quente com dados suficientes → propor agendamento
- "handoff_consultant": cliente pediu preço ou está pronto para fechar → passar para consultor
- "continue_conversation": ainda faltam dados → continuar coletando`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: latestMessage },
  ];

  const response = await invokeLLM({
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "lead_qualification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            temperature: { type: "string", enum: ["quente", "morno", "frio"] },
            serviceType: { type: "string", enum: ["rapido", "medio", "projeto", "indefinido"] },
            collectedData: {
              type: "object",
              properties: {
                nome: { type: ["string", "null"] },
                placa: { type: ["string", "null"] },
                sintoma: { type: ["string", "null"] },
                veiculo: { type: ["string", "null"] },
              },
              required: ["nome", "placa", "sintoma", "veiculo"],
              additionalProperties: false,
            },
            nextAction: { type: "string", enum: ["schedule", "handoff_consultant", "continue_conversation"] },
            responseMessage: { type: "string" },
          },
          required: ["temperature", "serviceType", "collectedData", "nextAction", "responseMessage"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as QualificationResult;
}

// ─── Agente 2: Reativação de Clientes ─────────────────────────────────────────

export async function generateReactivationMessage(clientData: {
  nome: string;
  ultimoServico: string;
  diasInativo: number;
  veiculo?: string;
  placa?: string;
}): Promise<string> {

  const systemPrompt = `Você é a Ana, assistente virtual da Doctor Auto Prime.
Gere uma mensagem de reativação personalizada para um cliente que não retornou.

REGRAS:
- Mensagem curta (máximo 3 linhas)
- Tom amigável e pessoal, não genérico
- Mencione o último serviço ou o veículo do cliente
- Crie um gancho de retorno relevante (revisão periódica, checagem pós-serviço, etc.)
- NUNCA mencione preço
- Termine com uma pergunta aberta para engajar

Retorne apenas o texto da mensagem, sem formatação extra.`;

  const userPrompt = `Cliente: ${clientData.nome}
Último serviço: ${clientData.ultimoServico}
Dias sem retornar: ${clientData.diasInativo}
Veículo: ${clientData.veiculo || "não informado"}
Placa: ${clientData.placa || "não informada"}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0].message.content as string;
}

// ─── Reativação em Lote ───────────────────────────────────────────────────────

export async function runReactivationCampaign(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, errors: 0 };

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  // Find clients with OS closed more than 90 days ago and no recent OS
  const inactiveClients = await db
    .select({
      clienteId: clientes.id,
      nome: clientes.nomeCompleto,
      telefone: clientes.telefone,
    })
    .from(clientes)
    .where(isNotNull(clientes.telefone))
    .limit(50); // Process max 50 per run to avoid rate limits

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const client of inactiveClients) {
    try {
      // Check last OS date
      const lastOS = await db
        .select({
          dataFechamento: ordensServico.dataSaida,
          descricaoServico: ordensServico.motivoVisita,
        })
        .from(ordensServico)
        .where(
          and(
            sql`${ordensServico.clienteId} = ${client.clienteId}`,
            sql`${ordensServico.status} = 'Entregue'`
          )
        )
        .orderBy(sql`${ordensServico.dataSaida} DESC`)
        .limit(1);

      if (!lastOS.length) continue;

      const lastDate = lastOS[0].dataFechamento;
      if (!lastDate) continue;
      const lastDateMs = lastDate instanceof Date ? lastDate.getTime() : Number(lastDate);
      if (lastDateMs > ninetyDaysAgo) continue; // Skip if recent

      const diasInativo = Math.floor((Date.now() - lastDateMs) / (24 * 60 * 60 * 1000));

      const message = await generateReactivationMessage({
        nome: client.nome,
        ultimoServico: lastOS[0].descricaoServico || "revisão",
        diasInativo,
      });

      // Send via Kommo (create a new lead/note or send WhatsApp message)
      // For now, we create a task in Kommo for the consultant to follow up
      await kommoPost("/tasks", [{
        text: `[REATIVAÇÃO IA] ${client.nome} — ${diasInativo} dias sem retornar.\n\nMensagem sugerida:\n${message}`,
        complete_till: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
        task_type_id: 1,
      }]);

      sent++;
      processed++;
    } catch (err) {
      errors++;
      processed++;
    }
  }

  return { processed, sent, errors };
}

// ─── Update Lead in Kommo ─────────────────────────────────────────────────────

export async function updateKommoLeadTemperature(
  leadId: number,
  temperature: LeadTemperature,
  notes?: string
): Promise<void> {
  // Map temperature to Kommo status tags
  const temperatureTag = {
    quente: "🔥 Quente",
    morno: "🌡️ Morno",
    frio: "❄️ Frio",
  }[temperature];

  await kommoPatch(`/leads/${leadId}`, {
    tags: [{ name: temperatureTag }],
    ...(notes ? { custom_fields_values: [] } : {}),
  });

  if (notes) {
    await kommoPost(`/leads/${leadId}/notes`, [{
      note_type: "common",
      params: { text: `[IA Ana] ${notes}` },
    }]);
  }
}
