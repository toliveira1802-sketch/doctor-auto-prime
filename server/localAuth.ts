/**
 * Local Authentication Routes
 * Allows colaboradores to login with email + password without Manus OAuth.
 * Creates the same JWT session cookie as the OAuth flow.
 */
import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { colaboradores } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import * as db from "./db";

// Mapeamento nivelAcessoId → perfil do sistema
function getPerfil(nivelAcessoId: number): string {
  if (nivelAcessoId === 1) return "admin";       // Direção / Admin
  if (nivelAcessoId === 2) return "gestor";      // Gestão
  if (nivelAcessoId === 3) return "consultor";   // Consultor Técnico
  if (nivelAcessoId === 4) return "mecanico";    // Mecânico
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
  // POST /api/auth/local-login
  app.post("/api/auth/local-login", async (req: Request, res: Response) => {
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!email || !senha) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }

    try {
      const drizzle = await getDb();
      if (!drizzle) {
        res.status(500).json({ error: "Banco de dados indisponível" });
        return;
      }

      // Busca colaborador ativo com email + senha
      const result = await drizzle
        .select()
        .from(colaboradores)
        .where(
          and(
            eq(colaboradores.email, email.toLowerCase().trim()),
            eq(colaboradores.senha, senha),
            eq(colaboradores.ativo, true)
          )
        )
        .limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      const colab = result[0];
      const perfil = getPerfil(colab.nivelAcessoId ?? 3);
      const redirectPath = getRedirectPath(perfil);

      // Cria um openId único para o colaborador (prefixo "local_" + id)
      const openId = `local_${colab.id}`;

      // Upsert no users table para manter consistência
      const role = (perfil === "admin") ? "admin" : "user";
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
