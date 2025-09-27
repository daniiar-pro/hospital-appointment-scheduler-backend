import type { Database } from "../../database";
import { userRepository } from "../../repositories/userRepository.js";
import { refreshTokenRepository, newOpaqueToken } from "../../repositories/refreshTokensRepository.js";
import { hashPassword, verifyPassword } from "../../libs/jwt/password.js";
import { sign } from "../../libs/jwt/index.js";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;

export function makeAuthService(db: Database, jwtSecret: string) {
  const users = userRepository(db);
  const tokens = refreshTokenRepository(db);

  return {
    async signup(input: { username: string; email: string; password: string }) {
      const passwordHash = await hashPassword(input.password);
      const row = await users.createUser({
        username: input.username,
        email: input.email,
        passwordHash,
        role: "patient",
      });
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
      };
    },

    async login(email: string, password: string) {
      const row = await users.findAuthByEmail(email);
      if (!row) {
        return null;
      }
      const ok = await verifyPassword(password, row.password_hash);
      if (!ok) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const accessToken = sign(
        {
          sub: row.id,
          role: row.role,
          iat: now,
          exp: now + ACCESS_TTL_SECONDS,
          iss: "hospital-api",
        },
        jwtSecret,
      );

      const refreshPlain = newOpaqueToken();
      await tokens.insert(row.id, refreshPlain, REFRESH_TTL_DAYS);

      return {
        user: {
          id: row.id,
          username: row.username,
          email: row.email,
          role: row.role,
        },
        accessToken,
        refreshPlain, 
      };
    },

    async refresh(refreshPlain: string) {
      const found = await tokens.findValid(refreshPlain);
      if (!found) {
        return null;
      }

      await tokens.revoke(refreshPlain);

      const user = await users.findAuthById(found.user_id);
      if (!user) {
        return null;
      }

      const newRt = newOpaqueToken();
      await tokens.insert(user.id, newRt, REFRESH_TTL_DAYS);

      const now = Math.floor(Date.now() / 1000);
      const accessToken = sign(
        {
          sub: user.id,
          role: user.role,
          iat: now,
          exp: now + ACCESS_TTL_SECONDS,
          iss: "hospital-api",
        },
        jwtSecret,
      );

      return { accessToken, refreshPlain: newRt };
    },

    async logout(refreshPlain: string | undefined) {
      if (refreshPlain) {
        await tokens.revoke(refreshPlain);
      }
    },
  };
}
