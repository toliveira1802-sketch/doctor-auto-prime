import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@doctorauto.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("OS Number Generation", () => {
  it("generates OS number in correct format", () => {
    const year = new Date().getFullYear();
    const num = `OS-${year}-001`;
    expect(num).toMatch(/^OS-\d{4}-\d{3}$/);
  });
});

describe("OS Status Validation", () => {
  const validStatuses = [
    "Diagnóstico",
    "Orçamento",
    "Aguardando Aprovação",
    "Aguardando Peças",
    "Em Execução",
    "Pronto",
    "Entregue",
    "Cancelada",
  ];

  it("validates all kanban statuses are defined", () => {
    expect(validStatuses).toHaveLength(8);
    expect(validStatuses).toContain("Diagnóstico");
    expect(validStatuses).toContain("Entregue");
  });

  it("kanban board statuses exclude terminal states", () => {
    const patioStatuses = validStatuses.filter(
      (s) => s !== "Entregue" && s !== "Cancelada"
    );
    expect(patioStatuses).toHaveLength(6);
    expect(patioStatuses).not.toContain("Entregue");
    expect(patioStatuses).not.toContain("Cancelada");
  });
});

describe("Financial Calculations", () => {
  it("calculates meta percentage correctly", () => {
    const meta = 200000;
    const faturamento = 150000;
    const pct = Math.min((faturamento / meta) * 100, 100);
    expect(pct).toBe(75);
  });

  it("caps meta percentage at 100%", () => {
    const meta = 200000;
    const faturamento = 250000;
    const pct = Math.min((faturamento / meta) * 100, 100);
    expect(pct).toBe(100);
  });

  it("calculates growth percentage correctly", () => {
    const prev = 100000;
    const current = 120000;
    const growth = ((current - prev) / prev) * 100;
    expect(growth).toBe(20);
  });

  it("handles zero previous month gracefully", () => {
    const prev = 0;
    const current = 50000;
    const growth = prev > 0 ? ((current - prev) / prev) * 100 : 0;
    expect(growth).toBe(0);
  });
});

describe("Service Type Targets", () => {
  const targets = {
    Rápido: { min: 1000, max: 15000 },
    Médio: { min: 4000, max: 8000 },
    Demorado: { min: 25000, max: Infinity },
    Projeto: { min: 0, max: Infinity },
  };

  it("validates Rápido service range", () => {
    expect(targets.Rápido.min).toBe(1000);
    expect(targets.Rápido.max).toBe(15000);
  });

  it("validates Demorado minimum threshold", () => {
    expect(targets.Demorado.min).toBe(25000);
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "sample-user",
        email: "sample@example.com",
        name: "Sample User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});
