const DEFAULT_COOKIE_PATH = "/";
const DEFAULT_SAME_SITE = "Lax";

function getSecureSuffix() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function setClientCookie(
  name: string,
  value: string,
  maxAge: number,
  options?: {
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
  }
) {
  if (typeof window === "undefined") return;
  const path = options?.path ?? DEFAULT_COOKIE_PATH;
  const sameSite = options?.sameSite ?? DEFAULT_SAME_SITE;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}${getSecureSuffix()}`;
}

export function clearClientCookie(name: string, path = DEFAULT_COOKIE_PATH) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; path=${path}; max-age=0; SameSite=${DEFAULT_SAME_SITE}${getSecureSuffix()}`;
}

export function hasClientCookie(name: string, expectedValue?: string) {
  if (typeof window === "undefined") return false;
  return document.cookie.split(";").some((cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName !== name) return false;
    if (expectedValue === undefined) return true;
    return decodeURIComponent(rawValue.join("=")) === expectedValue;
  });
}
