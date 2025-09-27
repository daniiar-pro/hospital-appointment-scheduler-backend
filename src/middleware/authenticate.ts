import { Request, Response, NextFunction } from "express";
import { verify } from "../libs/jwt/index.js";

export function authenticate(secret: string) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const payload = verify(token, secret, { issuer: "hospital-api" });
    if (!payload) {
      return res.status(401).json({ error: "Invalid/expired token" });
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  };
}

export function authorizeRole(...roles: Array<"doctor" | "patient" | "admin">) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
