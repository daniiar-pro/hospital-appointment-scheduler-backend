import crypto from "node:crypto";

// CUSTOM JWT LIBRARY (HS256 ONLY):
// base64url(header).base64url(payload).base64url(HMAC_SHA256(data, secret))

// base64url helpers
const b64url = (b: Buffer) =>
  b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const fromB64url = (s: string) => {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
};

//types
export type SignOptions = {
  expiresIn?: number; // seconds
  notBefore?: number; // seconds from now
  issuer?: string;
  audience?: string | string[];
  subject?: string; // set sub
};
export type VerifyOptions = {
  issuer?: string | string[];
  audience?: string | string[];
  clockSkewSec?: number; // default 60
};

type Header = { alg: "HS256"; typ: "JWT" };
export type Payload = Record<string, unknown> & {
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  sub?: string;
  role?: string;
};

const nowSec = () => Math.floor(Date.now() / 1000);
const hmac = (data: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(data).digest();

// sign
export function sign(
  payload: Payload,
  secret: string,
  opts: SignOptions = {}
): string {
  const header: Header = { alg: "HS256", typ: "JWT" };
  const iat = nowSec();
  const full: Payload = { ...payload, iat };
  if (opts.subject) full.sub = opts.subject;
  if (opts.expiresIn) full.exp = iat + opts.expiresIn;
  if (opts.notBefore) full.nbf = iat + opts.notBefore;
  if (opts.issuer) full.iss = opts.issuer;
  if (opts.audience) full.aud = opts.audience;

  const h = b64url(Buffer.from(JSON.stringify(header)));
  const p = b64url(Buffer.from(JSON.stringify(full)));
  const sig = b64url(hmac(`${h}.${p}`, secret));
  return `${h}.${p}.${sig}`;
}

// decode (no signature check, for debugging)
export function decode(token: string) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  try {
    return {
      header: JSON.parse(fromB64url(h).toString("utf8")),
      payload: JSON.parse(fromB64url(p).toString("utf8")),
    };
  } catch {
    return null;
  }
}

// verify
export function verify(
  token: string,
  secret: string,
  opts: VerifyOptions = {}
) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;

  // enforce alg/typ
  let header: Header;
  try {
    header = JSON.parse(fromB64url(h).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256" || header.typ !== "JWT") return null;

  // signature
  const expected = hmac(`${h}.${p}`, secret);
  const given = fromB64url(s);
  if (given.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(given, expected)) return null;
  } catch {
    return null;
  }

  // payload + claims
  let payload: Payload;
  try {
    payload = JSON.parse(fromB64url(p).toString("utf8")) as Payload;
  } catch {
    return null;
  }

  const now = nowSec();
  const skew = opts.clockSkewSec ?? 60;
  if (typeof payload.nbf === "number" && now + skew < payload.nbf) return null;
  if (typeof payload.exp === "number" && now - skew >= payload.exp) return null;

  if (opts.issuer) {
    const allowed = Array.isArray(opts.issuer) ? opts.issuer : [opts.issuer];
    if (!payload.iss || !allowed.includes(payload.iss as string)) return null;
  }
  if (opts.audience) {
    const want = Array.isArray(opts.audience) ? opts.audience : [opts.audience];
    const got = payload.aud;
    const gotArr = Array.isArray(got) ? got : [got];
    if (!got || !gotArr.some((a) => want.includes(a as string))) return null;
  }
  return payload;
}
