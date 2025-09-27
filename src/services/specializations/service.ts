import type { Database } from "../../database";
import { specializationsRepository } from "../../repositories/specializationsRepository.js";

export function makeSpecializationsService(db: Database) {
  const repo = specializationsRepository(db);
  return {
    list: () => repo.listAll(),
    create: (name: string, description: string | null) => repo.create(name, description),
    update: (id: string, patch: { name?: string; description?: string }) => repo.update(id, patch),
    remove: (id: string) => repo.remove(id),
  };
}
