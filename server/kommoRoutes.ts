import type { Express, Request, Response } from "express";
import { exchangeKommoCode, buildKommoAuthUrl, getKommoToken } from "./kommo";
import { ENV } from "./_core/env";

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
}
