/**
 * Tests for colaboradores CRUD procedures
 * Validates that list, create, update, delete, and resetSenha procedures
 * are correctly defined and accessible in the appRouter.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@doctorauto.com",
    name: "Admin",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      headers: { cookie: "" },
      hostname: "localhost",
      protocol: "http",
    } as unknown as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("colaboradores router", () => {
  it("should have a list procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.list).toBe("function");
  });

  it("should have a niveisAcesso procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.niveisAcesso).toBe("function");
  });

  it("should have a create procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.create).toBe("function");
  });

  it("should have an update procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.update).toBe("function");
  });

  it("should have a delete procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.delete).toBe("function");
  });

  it("should have a resetSenha procedure", () => {
    const caller = appRouter.createCaller(createAdminContext());
    expect(typeof caller.colaboradores.resetSenha).toBe("function");
  });

  it("should validate create input - nome is required", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.colaboradores.create({ nome: "", empresaId: 1 })
    ).rejects.toThrow();
  });

  it("should validate create input - nome must be at least 2 chars", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.colaboradores.create({ nome: "A", empresaId: 1 })
    ).rejects.toThrow();
  });

  it("should validate update input - id is required", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      // @ts-expect-error intentionally missing id
      caller.colaboradores.update({ nome: "Test" })
    ).rejects.toThrow();
  });

  it("should validate delete input - id is required", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      // @ts-expect-error intentionally missing id
      caller.colaboradores.delete({})
    ).rejects.toThrow();
  });
});
