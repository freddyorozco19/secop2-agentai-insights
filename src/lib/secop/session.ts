import { solveCaptcha, CaptchaError } from "./captcha";

const DEFAULT_BASE_URL = "https://community.secop.gov.co";
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const CAPTCHA_PATH = "/Public/Common/GoogleReCaptcha/Index";

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export interface SecopSession {
  publicSessionCookie: string;
  routeId: string;
  mkey: string;
  obtainedAt: number;
  validated: boolean;
}

function getBaseUrl(): string {
  return (process.env.SCRAPER_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

let cachedSession: SecopSession | null = null;

function extractCookieValue(
  setCookieHeaders: string[] | null,
  name: string,
): string | null {
  if (!setCookieHeaders) return null;
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

function extractMkey(html: string): string | null {
  const match = html.match(/mkey=([0-9a-f_-]+)/);
  return match ? match[1] : null;
}

export function buildCookieString(session: SecopSession): string {
  return `PublicSessionCookie=${session.publicSessionCookie}; ROUTEID=${session.routeId}`;
}

export function getCachedSession(): SecopSession | null {
  if (!cachedSession) return null;
  if (Date.now() - cachedSession.obtainedAt > SESSION_TTL_MS) {
    cachedSession = null;
    return null;
  }
  return cachedSession;
}

export function clearSession(): void {
  cachedSession = null;
}

export async function isSessionValid(
  session?: SecopSession,
): Promise<boolean> {
  const s = session ?? cachedSession;
  if (!s) return false;
  if (Date.now() - s.obtainedAt > SESSION_TTL_MS) return false;

  const baseUrl = getBaseUrl();
  const testUrl = `${baseUrl}/Public/Tendering/ContractNoticeManagement/Index?currentLanguage=en`;
  try {
    const response = await fetch(testUrl, {
      headers: {
        Cookie: buildCookieString(s),
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "manual",
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function refreshSession(): Promise<SecopSession> {
  const baseUrl = getBaseUrl();
  const targetUrl = `${baseUrl}/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.5802489`;
  const captchaUrl = `${baseUrl}${CAPTCHA_PATH}?previousUrl=${encodeURIComponent(targetUrl)}`;

  const captchaResponse = await fetch(captchaUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!captchaResponse.ok) {
    throw new SessionError(
      `No se pudo cargar la página de CAPTCHA (status ${captchaResponse.status}).`,
    );
  }

  const setCookie = captchaResponse.headers.getSetCookie();
  const publicSessionCookie = extractCookieValue(setCookie, "PublicSessionCookie");
  const routeId = extractCookieValue(setCookie, "ROUTEID");

  if (!publicSessionCookie || !routeId) {
    throw new SessionError(
      "No se recibieron cookies de sesión desde el portal SECOP II.",
    );
  }

  const html = await captchaResponse.text();
  const mkey = extractMkey(html);
  if (!mkey) {
    throw new SessionError("No se pudo extraer mkey del HTML del CAPTCHA.");
  }

  const sitekeyMatch = html.match(/data-sitekey=["']([^"']+)["']/);
  const sitekey = sitekeyMatch ? sitekeyMatch[1] : undefined;

  const token = await solveCaptcha(captchaUrl, { sitekey });

  const checkUrl = `${baseUrl}/Public/Common/GoogleReCaptcha/CaptchaCheck?responseKey=${encodeURIComponent(token)}&mkey=${encodeURIComponent(mkey)}`;
  const checkResponse = await fetch(checkUrl, {
    headers: {
      Cookie: `PublicSessionCookie=${publicSessionCookie}; ROUTEID=${routeId}`,
      "User-Agent": "Mozilla/5.0",
    },
    redirect: "manual",
  });

  if (checkResponse.status !== 302 && checkResponse.status !== 200) {
    throw new SessionError(
      `Validación de CAPTCHA falló (status ${checkResponse.status}).`,
    );
  }

  const session: SecopSession = {
    publicSessionCookie,
    routeId,
    mkey,
    obtainedAt: Date.now(),
    validated: true,
  };

  cachedSession = session;
  return session;
}

export async function getSession(): Promise<SecopSession> {
  const cached = getCachedSession();
  if (cached && cached.validated) {
    const valid = await isSessionValid(cached);
    if (valid) return cached;
  }
  return refreshSession();
}

export { CaptchaError };
