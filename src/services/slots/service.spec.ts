import { makeSlotsService } from "../slots/service.js";

let mockWeekly: any;
let mockExceptionsRepo: any;
let mockDocSpecs: any;
let mockSlotsRepo: any;

jest.mock("../../repositories/weeklyAvailabilityRepository.js", () => ({
  weeklyAvailabilityRepository: jest.fn(() => mockWeekly),
}));

jest.mock("../../repositories/slotExceptionsRepository.js", () => ({
  slotExceptionsRepository: jest.fn(() => mockExceptionsRepo),
}));

jest.mock("../../repositories/doctorSpecializationsRepository.js", () => ({
  doctorSpecializationsRepository: jest.fn(() => mockDocSpecs),
}));

jest.mock("../../repositories/availabilitySlotsRepository.js", () => ({
  availabilitySlotsRepository: jest.fn(() => mockSlotsRepo),
}));

function makeDb() {
  return { query: jest.fn(), pool: { query: jest.fn() } } as any;
}

describe("slots service", () => {
  const FIXED_NOW = new Date("2026-01-05T10:00:00Z"); // Monday

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(FIXED_NOW);

    mockWeekly = { list: jest.fn() };
    mockExceptionsRepo = { list: jest.fn() };
    mockDocSpecs = { listForDoctor: jest.fn() };
    mockSlotsRepo = {
      bulkInsertGenerated: jest.fn(
        (_doctorId: string, _specId: string, slots: any[]) => slots.length,
      ),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws if doctor has multiple specs and no specializationId is provided", async () => {
    mockDocSpecs.listForDoctor.mockResolvedValueOnce([
      { specialization_id: "s1" },
      { specialization_id: "s2" },
    ]);
    mockWeekly.list.mockResolvedValueOnce([]);
    mockExceptionsRepo.list.mockResolvedValueOnce([]);

    const db = makeDb();
    const svc = makeSlotsService(db);

    await expect(svc.regenerateForDoctor("doc-1", 1)).rejects.toThrow("SPECIALIZATION_REQUIRED");
    expect(mockSlotsRepo.bulkInsertGenerated).not.toHaveBeenCalled();
  });

  it("returns inserted:0 when no weekly templates", async () => {
    mockDocSpecs.listForDoctor.mockResolvedValueOnce([{ specialization_id: "spec-1" }]);
    mockWeekly.list.mockResolvedValueOnce([]);
    mockExceptionsRepo.list.mockResolvedValueOnce([]);

    const db = makeDb();
    const svc = makeSlotsService(db);
    const out = await svc.regenerateForDoctor("doc-1", 1);

    expect(out).toEqual({ inserted: 0 });
  });
});
