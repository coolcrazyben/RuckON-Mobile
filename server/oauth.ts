import crypto from "crypto";

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

interface AppleTokenPayload {
  sub: string;
  email?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error("Invalid Google ID token");
  }
  const payload = await res.json() as Record<string, unknown>;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid Google token: missing subject");
  }
  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("Invalid Google token: missing email");
  }

  const expectedClientId = process.env.GOOGLE_CLIENT_ID!;
  const aud = typeof payload.aud === "string" ? payload.aud : "";
  if (aud !== expectedClientId) {
    throw new Error("Invalid Google token: audience mismatch");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified === "true" || payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

function base64UrlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64");
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  const parts = identityToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Apple identity token format");
  }

  const headerJson = base64UrlDecode(parts[0]).toString("utf8");
  const payloadJson = base64UrlDecode(parts[1]).toString("utf8");

  let header: { kid?: string; alg?: string };
  let payload: Record<string, unknown>;

  try {
    header = JSON.parse(headerJson);
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid Apple identity token: malformed JWT");
  }

  if (!header.kid) {
    throw new Error("Invalid Apple identity token: missing key ID");
  }

  const keysRes = await fetch("https://appleid.apple.com/auth/keys");
  if (!keysRes.ok) {
    throw new Error("Failed to fetch Apple public keys");
  }
  const keysData = await keysRes.json() as { keys: Array<{ kid: string; kty: string; n: string; e: string }> };
  const key = keysData.keys.find((k) => k.kid === header.kid);
  if (!key) {
    throw new Error("Apple public key not found for token");
  }

  const pubKey = crypto.createPublicKey({
    key: {
      kty: key.kty,
      n: key.n,
      e: key.e,
    },
    format: "jwk",
  });

  const signatureInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlDecode(parts[2]);
  const alg = header.alg === "RS256" ? "RSA-SHA256" : "RSA-SHA256";
  const isValid = crypto.verify(alg, Buffer.from(signatureInput), pubKey, signature);

  if (!isValid) {
    throw new Error("Invalid Apple identity token: signature verification failed");
  }

  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Invalid Apple identity token: wrong issuer");
  }

  const expectedAud = process.env.APPLE_SERVICE_ID || process.env.APPLE_BUNDLE_ID;
  const aud = typeof payload.aud === "string" ? payload.aud : "";
  if (aud !== expectedAud) {
    throw new Error("Invalid Apple identity token: audience mismatch");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new Error("Apple identity token has expired");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid Apple identity token: missing subject");
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
