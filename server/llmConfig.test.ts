/**
 * llmConfig.test.ts
 *
 * Testa o helper getLLMConfig e a invalidação de cache.
 * Como o banco não está disponível no ambiente de teste, verifica que
 * os defaults são retornados corretamente quando o DB falha.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLM_DEFAULTS, invalidateLLMConfigCache } from "./_core/llmConfig";

// Mock do getDb para simular banco indisponível
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

describe("LLM_DEFAULTS", () => {
  it("deve ter modelo padrão definido", () => {
    expect(LLM_DEFAULTS.model).toBeTruthy();
    expect(typeof LLM_DEFAULTS.model).toBe("string");
  });

  it("deve ter temperatura entre 0 e 2", () => {
    expect(LLM_DEFAULTS.temperature).toBeGreaterThanOrEqual(0);
    expect(LLM_DEFAULTS.temperature).toBeLessThanOrEqual(2);
  });

  it("deve ter maxTokens entre 256 e 32768", () => {
    expect(LLM_DEFAULTS.maxTokens).toBeGreaterThanOrEqual(256);
    expect(LLM_DEFAULTS.maxTokens).toBeLessThanOrEqual(32768);
  });

  it("deve ter systemPrompt não vazio", () => {
    expect(LLM_DEFAULTS.systemPrompt.length).toBeGreaterThan(10);
  });

  it("deve ter modoDebug como boolean", () => {
    expect(typeof LLM_DEFAULTS.modoDebug).toBe("boolean");
  });
});

describe("getLLMConfig", () => {
  beforeEach(() => {
    invalidateLLMConfigCache();
  });

  it("deve retornar defaults quando o banco está indisponível", async () => {
    const { getLLMConfig } = await import("./_core/llmConfig");
    const cfg = await getLLMConfig();

    expect(cfg.model).toBe(LLM_DEFAULTS.model);
    expect(cfg.temperature).toBe(LLM_DEFAULTS.temperature);
    expect(cfg.maxTokens).toBe(LLM_DEFAULTS.maxTokens);
    expect(cfg.systemPrompt).toBe(LLM_DEFAULTS.systemPrompt);
    expect(cfg.modoDebug).toBe(LLM_DEFAULTS.modoDebug);
  });

  it("deve retornar objeto com todas as chaves esperadas", async () => {
    const { getLLMConfig } = await import("./_core/llmConfig");
    const cfg = await getLLMConfig();

    expect(cfg).toHaveProperty("model");
    expect(cfg).toHaveProperty("temperature");
    expect(cfg).toHaveProperty("maxTokens");
    expect(cfg).toHaveProperty("systemPrompt");
    expect(cfg).toHaveProperty("modoDebug");
  });
});

describe("invalidateLLMConfigCache", () => {
  it("deve ser uma função executável sem erros", () => {
    expect(() => invalidateLLMConfigCache()).not.toThrow();
  });

  it("deve permitir chamadas múltiplas sem erros", () => {
    expect(() => {
      invalidateLLMConfigCache();
      invalidateLLMConfigCache();
      invalidateLLMConfigCache();
    }).not.toThrow();
  });
});

describe("Validações de segurança nos defaults", () => {
  it("temperatura padrão deve ser um número válido", () => {
    expect(isNaN(LLM_DEFAULTS.temperature)).toBe(false);
  });

  it("maxTokens padrão deve ser um inteiro positivo", () => {
    expect(Number.isInteger(LLM_DEFAULTS.maxTokens)).toBe(true);
    expect(LLM_DEFAULTS.maxTokens).toBeGreaterThan(0);
  });

  it("modelo padrão não deve ser vazio", () => {
    expect(LLM_DEFAULTS.model.trim().length).toBeGreaterThan(0);
  });
});
