import { makeSpecializationsService } from "./service.js";

let mockRepo: any;

jest.mock("../../repositories/specializationsRepository.js", () => ({
  specializationsRepository: jest.fn(() => mockRepo),
}));

function makeDb() {
  return { query: jest.fn(), pool: { query: jest.fn() } } as any;
}

describe("specializations service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      listAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
  });

  it("list delegates to repo.listAll", async () => {
    const db = makeDb();
    const svc = makeSpecializationsService(db);

    mockRepo.listAll.mockResolvedValueOnce([{ id: "s1", name: "Cardiology" }]);

    const res = await svc.list();
    expect(res).toEqual([{ id: "s1", name: "Cardiology" }]);
    expect(mockRepo.listAll).toHaveBeenCalledTimes(1);
  });

  it("create delegates to repo.create", async () => {
    const db = makeDb();
    const svc = makeSpecializationsService(db);

    mockRepo.create.mockResolvedValueOnce({ id: "s2", name: "Dermatology", description: "Skin" });

    const res = await svc.create("Dermatology", "Skin");
    expect(res).toEqual({ id: "s2", name: "Dermatology", description: "Skin" });
    expect(mockRepo.create).toHaveBeenCalledWith("Dermatology", "Skin");
  });

  it("update delegates to repo.update", async () => {
    const db = makeDb();
    const svc = makeSpecializationsService(db);

    mockRepo.update.mockResolvedValueOnce({ id: "s1", name: "Cardiology", description: "Heart" });

    const res = await svc.update("s1", { description: "Heart" });
    expect(res).toEqual({ id: "s1", name: "Cardiology", description: "Heart" });
    expect(mockRepo.update).toHaveBeenCalledWith("s1", { description: "Heart" });
  });

  it("remove delegates to repo.remove", async () => {
    const db = makeDb();
    const svc = makeSpecializationsService(db);

    mockRepo.remove.mockResolvedValueOnce(true);

    const res = await svc.remove("s1");
    expect(res).toBe(true);
    expect(mockRepo.remove).toHaveBeenCalledWith("s1");
  });
});
