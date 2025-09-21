import { Router } from "express";
import type { Database } from "../../database";
import { makeAuthService } from "../../services/auth/service";
import { authenticate } from "../../middleware/authenticate";
import { z } from "zod";
import type { ZodError } from "zod";
import { signupDto, loginDto } from "../../entities";

function zodToResponse(err: ZodError) {
  return {
    message: "Validation failed",
    errors: err.issues.map((i) => ({
      path: i.path.join("."),
      code: i.code,
      message: i.message,
    })),
  };
}

export function makeAuthRouter(db: Database, jwtSecret: string) {
  const router = Router();
  const service = makeAuthService(db, jwtSecret);

  router.post("/signup", async (req, res) => {
    const parsed = signupDto.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(zodToResponse(parsed.error));
    }

    try {
      const user = await service.signup(parsed.data);
      return res.status(201).json(user); // { id, username, email, role }
    } catch (e: any) {
      if (e.message === "EMAIL_TAKEN") {
        return res.status(409).json({ error: "Email already in use" });
      }
      return res.status(500).json({ error: "Internal error" });
    }
  });

  router.post("/login", async (req, res) => {
    const parsed = loginDto.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(zodToResponse(parsed.error));
    }

    const result = await service.login(parsed.data.email, parsed.data.password);
    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.cookie("refreshToken", result.refreshPlain, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: `You signed in as ${result.user.role}`,
      accessToken: result.accessToken,
    });
  });

  router.post("/refresh", async (req, res) => {
    const rt = (req as any).cookies?.refreshToken;
    if (!rt) return res.status(401).json({ error: "Missing refresh token" });

    const result = await service.refresh(rt);
    if (!result)
      return res.status(401).json({ error: "Invalid/expired refresh token" });

    res.cookie("refreshToken", result.refreshPlain, {
      httpOnly: true,
      sameSite: "strict",
      // secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ accessToken: result.accessToken });
  });

  router.post("/logout", async (req, res) => {
    const rt = (req as any).cookies?.refreshToken;
    await service.logout(rt);
    res.clearCookie("refreshToken");
    return res.status(204).end("You are logged out");
  });

  // PROFILE (protected)
  router.get("/profile", authenticate(jwtSecret), (req: any, res) => {
    res.json({ id: req.user.id, role: req.user.role });
  });

  return router;
}
