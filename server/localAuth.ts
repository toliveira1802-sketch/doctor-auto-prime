/**
 * Local Authentication Routes — Doctor Auto Prime
 * Handles profile-based login with bcrypt password hashing,
 * login attempt limiting (5 attempts → lock), and session management.
 */
import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { colaboradores } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import * as db from "./db";
import {
  verifyPassword,
  hashPassword,
  isDefaultPassword,
  isBcryptHash,
  getHashedDefaultPassword,
} from "./passwordUtils";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Mapeamento nivelAcessoId → role do sistema
function getRoleFromNivel(nivelAcessoId: number): string {
  const map: Record<number, string> = {
    1: "dev",
    2: "gestao",
    3: "consultor",
    4: "mecanico",
    5: "cliente",
    6: "mecanico", // Terceirizado → mecânico
  };
  return map[nivelAcessoId] ?? "consultor";
}

// Mapeamento role → rota de redirect
function getRedirectPath(role: string): string {
  const map: Record<string, string> = {
    dev: "/dev/painel",
    gestao: "/gestao/os-ultimate",
    consultor: "/admin/dashboard",
    mecanico: "/mecanico",
    cliente: "/cliente",
  };
  return map[role] ?? "/admin/dashboard";
}

// Mapeamento role → nivelAcessoId esperado
function getNivelFromRole(role: string): number[] {
  const map: Record<string, number[]> = {
    dev: [1],
    gestao: [2],
    consultor: [3],
    mecanico: [4, 6],
  };
  return map[role] ?? [];
}

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/local-login
   * Main login endpoint: username + password + selected profile
   * Validates credentials, checks role match, handles lockout.
   */
  app.post("/api/auth/local-login", async (req: Request, res: Response) => {
    const { username, senha, perfil, lembrar } = req.body as {
      username?: string;
      senha?: string;
      perfil?: string;
      lembrar?: boolean;
    };

    if (!username || !senha) {
      res.status(400).json({ error: "Informe usuário e senha" });
      return;
    }

    try {
      const drizzle = await getDb();
      if (!drizzle) {
        res.status(500).json({ error: "Banco de dados indisponível" });
        return;
      }

      // Busca pelo username (case-insensitive)
      const result = await drizzle
        .select()
        .from(colaboradores)
        .limit(50);

      const colab = result.find(
        (c) => c.username?.toLowerCase() === username.toLowerCase()
      );

      if (!colab) {
        res.status(401).json({ error: "Usuário não encontrado" });
        return;
      }

      if (!colab.ativo) {
        res.status(401).json({ error: "Usuário inativo. Entre em contato com o administrador." });
        return;
      }

      // Check if account is locked
      if (colab.lockedUntil && new Date(colab.lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(colab.lockedUntil).getTime() - Date.now()) / 60000
        );
        res.status(423).json({
          error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutesLeft} minuto(s).`,
          locked: true,
          minutesLeft,
        });
        return;
      }

      // Verify password (supports both plain-text legacy and bcrypt)
      const storedPassword = colab.senha ?? "123456";
      const passwordValid = await verifyPassword(senha, storedPassword);

      if (!passwordValid) {
        // Increment failed attempts
        const newAttempts = (colab.failedAttempts ?? 0) + 1;
        const updateData: Record<string, any> = { failedAttempts: newAttempts };

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        }

        await drizzle
          .update(colaboradores)
          .set(updateData)
          .where(eq(colaboradores.id, colab.id));

        const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        if (remaining > 0) {
          res.status(401).json({
            error: `Senha incorreta. ${remaining} tentativa(s) restante(s).`,
            attemptsRemaining: remaining,
          });
        } else {
          res.status(423).json({
            error: "Conta bloqueada por excesso de tentativas. Tente novamente em 15 minutos.",
            locked: true,
            minutesLeft: 15,
          });
        }
        return;
      }

      // Password correct — reset failed attempts
      await drizzle
        .update(colaboradores)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(colaboradores.id, colab.id));

      // If password is plain-text, migrate to bcrypt silently
      if (!isBcryptHash(storedPassword)) {
        const hashed = await hashPassword(storedPassword);
        await drizzle
          .update(colaboradores)
          .set({ senha: hashed })
          .where(eq(colaboradores.id, colab.id));
      }

      // Determine role
      const role = getRoleFromNivel(colab.nivelAcessoId ?? 3);

      // Validate that the selected profile matches the user's role
      // Dev can access any profile; others must match
      if (perfil && role !== "dev") {
        const allowedNiveis = getNivelFromRole(perfil);
        if (allowedNiveis.length > 0 && !allowedNiveis.includes(colab.nivelAcessoId ?? 3)) {
          res.status(403).json({
            error: `Seu usuário não tem permissão para o perfil "${perfil}". Seu perfil é "${role}".`,
          });
          return;
        }
      }

      const redirectPath = getRedirectPath(perfil && role === "dev" ? perfil : role);

      // Check if first access (default password)
      const isFirstAccess = colab.primeiroAcesso === true;

      // Create session
      const openId = `local_${colab.id}`;
      const userRole = role === "dev" ? "admin" : "user";

      await db.upsertUser({
        openId,
        name: colab.nome,
        email: colab.email ?? null,
        loginMethod: "local",
        role: userRole,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: colab.nome,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      // "Lembrar de mim" → session doesn't expire (ONE_YEAR_MS)
      // Without → session cookie (expires when browser closes)
      const maxAge = lembrar ? ONE_YEAR_MS : undefined;
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge });

      res.json({
        success: true,
        nome: colab.nome,
        role: perfil && role === "dev" ? perfil : role,
        redirectPath,
        primeiroAcesso: isFirstAccess,
        colaboradorId: colab.id,
        login: colab.username ?? username,
      });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "Erro interno ao fazer login" });
    }
  });

  /**
   * POST /api/auth/change-password
   * Change password (first access or voluntary).
   * Accepts: { colaboradorId, novaSenha }
   * Hashes with bcrypt before storing.
   */
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    const { colaboradorId, novaSenha } = req.body as {
      colaboradorId?: number;
      novaSenha?: string;
    };

    if (!colaboradorId || !novaSenha || novaSenha.length < 8) {
      res.status(400).json({
        error: "Dados inválidos. A nova senha deve ter no mínimo 8 caracteres.",
      });
      return;
    }

    try {
      const drizzle = await getDb();
      if (!drizzle) {
        res.status(500).json({ error: "Banco de dados indisponível" });
        return;
      }

      const hashedPassword = await hashPassword(novaSenha);

      await drizzle
        .update(colaboradores)
        .set({
          senha: hashedPassword,
          primeiroAcesso: false,
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(colaboradores.id, colaboradorId));

      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Change password failed", error);
      res.status(500).json({ error: "Erro interno ao trocar senha" });
    }
  });

  /**
   * POST /api/auth/local-logout
   * Clears the session cookie.
   */
  app.post("/api/auth/local-logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions });
    res.json({ success: true });
  });

  // ─── LEGACY ENDPOINTS (kept for backward compatibility) ───────────────────

  /**
   * POST /api/auth/local-login-perfil — legacy profile PIN login
   * Redirects to the new unified login flow.
   */
  app.post("/api/auth/local-login-perfil", async (req: Request, res: Response) => {
    res.status(410).json({
      error: "Este endpoint foi descontinuado. Use /api/auth/local-login.",
    });
  });

  /**
   * POST /api/auth/local-login-username — legacy username+password login
   * Now redirects to the new unified endpoint.
   */
  app.post("/api/auth/local-login-username", async (req: Request, res: Response) => {
    // Forward to the new unified login
    const { username, senha } = req.body as { username?: string; senha?: string };
    if (!username || !senha) {
      res.status(400).json({ error: "Informe usuário e senha" });
      return;
    }

    try {
      const drizzle = await getDb();
      if (!drizzle) {
        res.status(500).json({ error: "Banco de dados indisponível" });
        return;
      }

      const result = await drizzle
        .select()
        .from(colaboradores)
        .where(eq(colaboradores.ativo, true))
        .limit(50);

      const colab = result.find(
        (c) => c.username?.toLowerCase() === username.toLowerCase()
      );

      if (!colab) {
        res.status(401).json({ error: "Usuário não encontrado" });
        return;
      }

      // Check lock
      if (colab.lockedUntil && new Date(colab.lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(colab.lockedUntil).getTime() - Date.now()) / 60000
        );
        res.status(423).json({
          error: `Conta bloqueada. Tente em ${minutesLeft} minuto(s).`,
          locked: true,
        });
        return;
      }

      const storedPassword = colab.senha ?? "123456";
      const passwordValid = await verifyPassword(senha, storedPassword);

      if (!passwordValid) {
        const newAttempts = (colab.failedAttempts ?? 0) + 1;
        const updateData: Record<string, any> = { failedAttempts: newAttempts };
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        }
        await drizzle.update(colaboradores).set(updateData).where(eq(colaboradores.id, colab.id));
        res.status(401).json({ error: "Senha incorreta" });
        return;
      }

      // Reset attempts
      await drizzle.update(colaboradores).set({ failedAttempts: 0, lockedUntil: null }).where(eq(colaboradores.id, colab.id));

      // Migrate plain-text password
      if (!isBcryptHash(storedPassword)) {
        const hashed = await hashPassword(storedPassword);
        await drizzle.update(colaboradores).set({ senha: hashed }).where(eq(colaboradores.id, colab.id));
      }

      const role = getRoleFromNivel(colab.nivelAcessoId ?? 3);
      const redirectPath = getRedirectPath(role);
      const openId = `local_${colab.id}`;

      await db.upsertUser({
        openId,
        name: colab.nome,
        email: colab.email ?? null,
        loginMethod: "local",
        role: role === "dev" ? "admin" : "user",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: colab.nome,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        nome: colab.nome,
        perfil: role,
        redirectPath,
        primeiroAcesso: colab.primeiroAcesso === true,
        colaboradorId: colab.id,
      });
    } catch (error) {
      console.error("[LocalAuth] Legacy username login failed", error);
      res.status(500).json({ error: "Erro interno ao fazer login" });
    }
  });
}
