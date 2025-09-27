import type { Database } from "../../database";
import { userRepository } from "../../repositories/userRepository.js";
import { refreshTokenRepository } from "../../repositories/refreshTokensRepository.js";

export function makeUsersService(db: Database) {
  const users = userRepository(db);
  const tokens = refreshTokenRepository(db);

  return {
    list: (opts: Parameters<typeof users.listPublicUsers>[0]) => users.listPublicUsers(opts),

    getPublic: (id: string) => users.getPublicById(id),

    async changeRole(id: string, role: "patient" | "doctor" | "admin") {
      const updated = await users.updateUser(id, { role });
      if (!updated) {
        return null;
      }
      await users.incrementTokenVersion(id);
      return { id: updated.id, email: updated.email, role: updated.role };
    },

    async updateProfileAdmin(
      id: string,
      patch: Partial<{
        username: string;
        email: string;
        role: "patient" | "doctor" | "admin";
      }>,
    ) {
      const updated = await users.updateUser(id, patch);
      return updated
        ? {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            role: updated.role,
          }
        : null;
    },

    logoutAllDevices: (userId: string) => tokens.revokeAllForUser(userId),

    deleteUser: (id: string) => users.deleteUser(id),
  };
}
