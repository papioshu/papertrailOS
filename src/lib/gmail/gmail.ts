import "server-only";
import { prisma } from "@/lib/prisma";

// Gmail integration over raw REST (no googleapis SDK). Every entry point fails
// loudly and specifically when the required Google env vars are absent.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export class GoogleNotConfigured extends Error {
  constructor() {
    super("Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REDIRECT_URI.");
  }
}

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GMAIL_REDIRECT_URI,
  );
}

function requireConfig() {
  if (!googleConfigured()) throw new GoogleNotConfigured();
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GMAIL_REDIRECT_URI!,
  };
}

/** Consent URL. `state` carries the profile slug through the round trip. */
export function authUrl(state: string): string {
  const { clientId, redirectUri } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPES,
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const { clientId, clientSecret } = requireConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${await res.text()}`);
  const data = (await res.json()) as { email?: string };
  return data.email ?? "unknown";
}

type Connection = {
  id: string;
  refreshToken: string;
  accessToken: string | null;
  expiry: Date | null;
};

/** Return a valid access token, refreshing + persisting it when near expiry. */
async function freshAccessToken(conn: Connection): Promise<string> {
  const stillValid =
    conn.accessToken && conn.expiry && conn.expiry.getTime() - Date.now() > 60_000;
  if (stillValid) return conn.accessToken!;

  const { access_token, expires_in } = await refreshAccessToken(conn.refreshToken);
  await prisma.gmailConnection.update({
    where: { id: conn.id },
    data: { accessToken: access_token, expiry: new Date(Date.now() + expires_in * 1000) },
  });
  return access_token;
}

/** Create a Gmail draft from an already base64url-encoded RFC822 message. */
export async function createGmailDraft(conn: Connection, encodedRaw: string): Promise<string> {
  const token = await freshAccessToken(conn);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { raw: encodedRaw } }),
  });
  if (!res.ok) throw new Error(`Gmail draft create failed: ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Send a message immediately. Used only by the controlled-send path. */
export async function sendGmailMessage(conn: Connection, encodedRaw: string): Promise<string> {
  const token = await freshAccessToken(conn);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: encodedRaw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}
