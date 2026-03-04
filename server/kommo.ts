import { ENV } from "./_core/env";
import { getDb } from "./db";
import { kommoTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const KOMMO_BASE = `https://${ENV.kommoDomain}`;

// ─── Token Storage ────────────────────────────────────────────────────────────

export async function saveKommoTokens(data: {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  base_domain: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const expiresAt = Date.now() + data.expires_in * 1000;

  // Check if we already have a token row
  const existing = await db.select().from(kommoTokens).limit(1);
  if (existing.length > 0) {
    await db.update(kommoTokens).set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresAt,
      baseDomain: data.base_domain,
    });
  } else {
    await db.insert(kommoTokens).values({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresAt,
      baseDomain: data.base_domain,
    });
  }
}

export async function getKommoToken(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(kommoTokens).limit(1);
  if (!rows.length) return null;

  const token = rows[0];

  // If token expires in less than 5 minutes, refresh it
  if (token.expiresAt - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshKommoToken(token.refreshToken, token.baseDomain);
      return refreshed;
    } catch {
      return null;
    }
  }

  return token.accessToken;
}

async function refreshKommoToken(refreshToken: string, baseDomain: string): Promise<string> {
  const res = await fetch(`https://${baseDomain}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: ENV.kommoClientId,
      client_secret: ENV.kommoClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: `${ENV.oAuthServerUrl}/api/kommo/callback`,
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Kommo token");
  const data = await res.json() as any;
  await saveKommoTokens({ ...data, base_domain: baseDomain });
  return data.access_token;
}

// ─── Kommo API Helpers ────────────────────────────────────────────────────────

export async function kommoGet(path: string): Promise<any> {
  const token = await getKommoToken();
  if (!token) throw new Error("Kommo not connected");

  const res = await fetch(`${KOMMO_BASE}/api/v4${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kommo API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function kommoPost(path: string, body: any): Promise<any> {
  const token = await getKommoToken();
  if (!token) throw new Error("Kommo not connected");

  const res = await fetch(`${KOMMO_BASE}/api/v4${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kommo API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function kommoPatch(path: string, body: any): Promise<any> {
  const token = await getKommoToken();
  if (!token) throw new Error("Kommo not connected");

  const res = await fetch(`${KOMMO_BASE}/api/v4${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kommo API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── OAuth URL Builder ────────────────────────────────────────────────────────

export function buildKommoAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: ENV.kommoClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: "doctor-auto-prime",
    mode: "post_message",
  });
  return `https://www.kommo.com/oauth?${params.toString()}`;
}

// ─── Exchange code for tokens ─────────────────────────────────────────────────

export async function exchangeKommoCode(code: string, redirectUri: string): Promise<void> {
  const res = await fetch(`${KOMMO_BASE}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: ENV.kommoClientId,
      client_secret: ENV.kommoClientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kommo token exchange failed: ${err}`);
  }

  const data = await res.json() as any;
  await saveKommoTokens({
    ...data,
    base_domain: ENV.kommoDomain,
  });
}
