import { Router } from "express";
import { hashPassword, verifyPassword } from "./password.js";
import { sign } from "../../libs/jwt/index.js";
import { createUser, findByEmail, findById, Role } from "../users/repo.file.js";
import {
  newOpaqueToken,
  insertRefreshToken,
  findValidToken,
  revokeToken,
} from "../tokens/repo.file.js";
import { CONFIG } from "../../config.js";

export function makeAuthRouter(secret: string) {
  const r = Router();

  // SIGN-UP
  r.post("/signup", async (req, res) => {
    const { email, password, role } = req.body ?? {};
    if (!email || !password || !["doctor", "patient"].includes(role)) {
      return res
        .status(400)
        .json({ error: "email, password, role(doctor|patient) required" });
    }
    try {
      const hpw = await hashPassword(password);
      const user = await createUser(email, hpw, role as Role);
      return res
        .status(201)
        .json({ id: user.id, email: user.email, role: user.role });
    } catch (e: any) {
      return res.status(409).json({ error: "Email already in use" });
    }
  });

  // LOGIN -> issue access + refresh
  r.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password)
      return res.status(400).json({ error: "email & password required" });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const now = Math.floor(Date.now() / 1000);
    const accessToken = sign(
      {
        sub: user.id,
        role: user.role,
        iat: now,
        exp: now + CONFIG.ACCESS_TTL_SECONDS,
        iss: "hospital-api",
      },
      secret
    );
    const refreshToken = newOpaqueToken();
    await insertRefreshToken(user.id, refreshToken, CONFIG.REFRESH_TTL_DAYS);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      // secure: true, // enable with HTTPS
      maxAge: CONFIG.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.json({ message: `You signed in as ${user.role}`, accessToken });
  });

  // REFRESH (rotate refresh, issue new access)
  r.post("/refresh", async (req, res) => {
    const rt = req.cookies?.refreshToken;
    if (!rt) return res.status(401).json({ error: "Missing refresh token" });

    const found = await findValidToken(rt);
    if (!found)
      return res.status(401).json({ error: "Invalid/expired refresh token" });

    // rotate refresh
    await revokeToken(rt);
    const newRt = newOpaqueToken();
    await insertRefreshToken(found.userId, newRt, CONFIG.REFRESH_TTL_DAYS);

    const user = await findById(found.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const now = Math.floor(Date.now() / 1000);
    const accessToken = sign(
      {
        sub: user.id,
        role: user.role,
        iat: now,
        exp: now + CONFIG.ACCESS_TTL_SECONDS,
        iss: "hospital-api",
      },
      secret
    );

    res.cookie("refreshToken", newRt, {
      httpOnly: true,
      sameSite: "strict",
      // secure: true,
      maxAge: CONFIG.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  });

  // LOGOUT
  r.post("/logout", async (req, res) => {
    const rt = req.cookies?.refreshToken;
    if (rt) await revokeToken(rt);
    res.clearCookie("refreshToken");
    return res.status(204).end();
  });

  return r;
}
