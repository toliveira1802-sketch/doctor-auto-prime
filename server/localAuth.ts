/**
 * Local Authentication Routes
 * Login por seleção de colaborador (sem senha) — modo teste.
 * Cria o mesmo JWT session cookie que o fluxo OAuth.
 */
import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { colaboradores } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import * as db from "./db";

// Mapeamento nivelAcessoId → perfil do sistema
function getPerfil(nivelAcessoId: number): string {
  if (nivelAcessoId === 1) return "admin";
  if (nivelAcessoId === 2) return "gestor";
  if (nivelAcessoId === 3) return "consultor";
  if (nivelAcessoId === 4) return "mecanico";
  return "consultor";
}

// Mapeamento perfil → rota de redirect
function getRedirectPath(perfil: string): string {
  if (perfil === "admin") return "/admin/dashboard";
  if (perfil === "gestor") return "/gestao/visao-geral";
  if (perfil === "mecanico") return "/mecanico";
  return "/admin/dashboard"; // consultor
}

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/local-login — aceita { colaboradorId } (sem senha)
  app.post("/api/auth/local-login", async (req: Request, res: Response) => {
    const { colaboradorId } = req.body as { colaboradorId?: number };

    if (!colaboradorId) {
      res.status(400).json({ error: "Selecione um colaborador" });
      return;
    }

    try {
      const drizzle = await getDb();
      if (!drizzle) {
        res.status(500).json({ error: "Banco de dados indisponível" });
        return;
      }

      // Busca colaborador ativo pelo id
      const result = await drizzle
        .select()
        .from(colaboradores)
        .where(
          and(
            eq(colaboradores.id, colaboradorId),
            eq(colaboradores.ativo, true)
          )
        )
        .limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "Colaborador não encontrado ou inativo" });
        return;
      }

      const colab = result[0];
      const perfil = getPerfil(colab.nivelAcessoId ?? 3);
      const redirectPath = getRedirectPath(perfil);

      // openId único para o colaborador
      const openId = `local_${colab.id}`;

      // Upsert no users table para manter consistência
      const role = perfil === "admin" ? "admin" : "user";
      await db.upsertUser({
        openId,
        name: colab.nome,
        email: colab.email ?? null,
        loginMethod: "local",
        role,
        lastSignedIn: new Date(),
      });

      // Cria sessão JWT (mesmo mecanismo do OAuth)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: colab.nome,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        nome: colab.nome,
        perfil,
        redirectPath,
      });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "Erro interno ao fazer login" });
    }
  });

  // POST /api/auth/local-logout
  app.post("/api/auth/local-logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions });
    res.json({ success: true });
  });
}
