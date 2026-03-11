/**
 * llmConfig.ts
 *
 * Helper que lê as configurações do Perfil IA salvas na tabela system_config
 * e retorna os parâmetros a serem usados pelo invokeLLM em produção.
 *
 * Chaves utilizadas (mesmas da página /dev/qgia/perfil-ia):
 *   ia.perfil.modelo        → model (ex: "gemini-2.5-flash")
 *   ia.perfil.temperatura   → temperature (0.0 – 1.0)
 *   ia.perfil.maxTokens     → max_tokens (256 – 8192)
 *   ia.perfil.systemPrompt  → system prompt padrão do agente principal
 *   ia.perfil.modoDebug     → se true, loga parâmetros no console
 */

import { getDb } from "../db";
import { systemConfig } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";

// ─── Defaults (usados quando a chave não existe no banco) ─────────────────────
export const LLM_DEFAULTS = {
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt:
    "Você é Sophia, a IA orquestradora central da Doctor Auto Prime. Você é estratégica, analítica e orientada a dados. Sua missão é apoiar a equipe com insights sobre leads, agendamentos e performance da oficina. Responda sempre em português brasileiro, de forma direta e objetiva.",
  modoDebug: false,
} as const;

// ─── Chaves no banco ──────────────────────────────────────────────────────────
const CHAVES = [
  "ia.perfil.modelo",
  "ia.perfil.temperatura",
  "ia.perfil.maxTokens",
  "ia.perfil.systemPrompt",
  "ia.perfil.modoDebug",
] as const;

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  modoDebug: boolean;
}

/**
 * Lê as configs do Perfil IA do banco.
 * Retorna os defaults para qualquer chave não encontrada.
 * Cache de 60 segundos para evitar query a cada chamada.
 */
let _cache: LLMConfig | null = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60_000; // 60 segundos

export async function getLLMConfig(): Promise<LLMConfig> {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  const db = await getDb();
  if (!db) {
    return { ...LLM_DEFAULTS };
  }

  try {
    const rows = await db
      .select({ chave: systemConfig.chave, valor: systemConfig.valor })
      .from(systemConfig)
      .where(inArray(systemConfig.chave, [...CHAVES]));

    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.chave && row.valor !== null && row.valor !== undefined) {
        map[row.chave] = row.valor;
      }
    }

    const config: LLMConfig = {
      model: map["ia.perfil.modelo"] ?? LLM_DEFAULTS.model,
      temperature: map["ia.perfil.temperatura"]
        ? parseFloat(map["ia.perfil.temperatura"])
        : LLM_DEFAULTS.temperature,
      maxTokens: map["ia.perfil.maxTokens"]
        ? parseInt(map["ia.perfil.maxTokens"], 10)
        : LLM_DEFAULTS.maxTokens,
      systemPrompt: map["ia.perfil.systemPrompt"] ?? LLM_DEFAULTS.systemPrompt,
      modoDebug: map["ia.perfil.modoDebug"] === "true",
    };

    // Validações de segurança
    if (isNaN(config.temperature) || config.temperature < 0 || config.temperature > 2) {
      config.temperature = LLM_DEFAULTS.temperature;
    }
    if (isNaN(config.maxTokens) || config.maxTokens < 256 || config.maxTokens > 32768) {
      config.maxTokens = LLM_DEFAULTS.maxTokens;
    }

    _cache = config;
    _cacheAt = now;

    if (config.modoDebug) {
      console.log("[LLMConfig] Loaded from DB:", {
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPromptLength: config.systemPrompt.length,
      });
    }

    return config;
  } catch (err) {
    console.error("[LLMConfig] Failed to load from DB, using defaults:", err);
    return { ...LLM_DEFAULTS };
  }
}

/**
 * Invalida o cache para forçar releitura do banco na próxima chamada.
 * Deve ser chamado após salvar novas configs via config.setMany.
 */
export function invalidateLLMConfigCache() {
  _cache = null;
  _cacheAt = 0;
  // Também invalida cache de agentes
  _agentCaches = {};
}

// ─── Cache por agente ─────────────────────────────────────────────────────────
interface AgentConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  ativo: boolean;
}

const AGENT_DEFAULTS: Record<string, AgentConfig> = {
  sophia: {
    systemPrompt: LLM_DEFAULTS.systemPrompt,
    temperature: 0.4,
    maxTokens: 1024,
    model: LLM_DEFAULTS.model,
    ativo: true,
  },
  simone: {
    systemPrompt: "Você é Simone, a IA de inteligência operacional interna da Doctor Auto Prime.",
    temperature: 0.2,
    maxTokens: 2048,
    model: LLM_DEFAULTS.model,
    ativo: true,
  },
  raena: {
    systemPrompt: "Você é Raena, a IA de inteligência comercial externa da Doctor Auto Prime.",
    temperature: 0.3,
    maxTokens: 2048,
    model: LLM_DEFAULTS.model,
    ativo: true,
  },
};

let _agentCaches: Record<string, { config: AgentConfig; at: number }> = {};

/**
 * Lê as configs de um agente específico (sophia | simone | raena) do banco.
 * Cache de 60s por agente.
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig> {
  const now = Date.now();
  const cached = _agentCaches[agentId];
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.config;
  }

  const defaults = AGENT_DEFAULTS[agentId] ?? AGENT_DEFAULTS.sophia;
  const db = await getDb();
  if (!db) return { ...defaults };

  try {
    const prefix = `ia.agente.${agentId}.`;
    const chaves = [
      `${prefix}systemPrompt`,
      `${prefix}temperatura`,
      `${prefix}maxTokens`,
      `${prefix}modelo`,
      `${prefix}ativo`,
    ];

    const rows = await db
      .select({ chave: systemConfig.chave, valor: systemConfig.valor })
      .from(systemConfig)
      .where(inArray(systemConfig.chave, chaves));

    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.chave && row.valor !== null) map[row.chave] = row.valor;
    }

    const config: AgentConfig = {
      systemPrompt: map[`${prefix}systemPrompt`] ?? defaults.systemPrompt,
      temperature: map[`${prefix}temperatura`]
        ? parseFloat(map[`${prefix}temperatura`])
        : defaults.temperature,
      maxTokens: map[`${prefix}maxTokens`]
        ? parseInt(map[`${prefix}maxTokens`], 10)
        : defaults.maxTokens,
      model: map[`${prefix}modelo`] ?? defaults.model,
      ativo: map[`${prefix}ativo`] !== "false",
    };

    _agentCaches[agentId] = { config, at: now };
    return config;
  } catch (err) {
    console.error(`[AgentConfig] Failed for ${agentId}:`, err);
    return { ...defaults };
  }
}
