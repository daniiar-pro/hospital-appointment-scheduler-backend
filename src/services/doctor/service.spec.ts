import { makeDoctorsService } from "./service.js";

let mockUsers: any;
let mockDocSpecs: any;
let mockWeekly: any;
let mockEx: any;

jest.mock("../../repositories/userRepository.js", () => ({
  userRepository: jest.fn(() => mockUsers),
}));

jest.mock("../../repositories/doctorSpecializationsRepository.js", () => ({
  doctorSpecializationsRepository: jest.fn(() => mockDocSpecs),
}));

jest.mock("../../repositories/weeklyAvailabilityRepository.js", () => ({
  weeklyAvailabilityRepository: jest.fn(() => mockWeekly),
}));

jest.mock("../../repositories/slotExceptionsRepository.js", () => ({
  slotExceptionsRepository: jest.fn(() => mockEx),
}));

function makeDb() {
  return { query: jest.fn(), pool: { query: jest.fn() } } as any;
}

describe("doctors service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsers = {
      getPublicById: jest.fn(),
      updateUser: jest.fn(),
    };
    mockDocSpecs = {
      listForDoctor: jest.fn(),
      replaceAll: jest.fn(),
      removeOne: jest.fn(),
    };
    mockWeekly = {
      list: jest.fn(),
      upsert: jest.fn(),
    };
    mockEx = {
      list: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };
  });

  it("getMyProfile delegates to users.getPublicById", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);
    mockUsers.getPublicById.mockResolvedValueOnce({
      id: "d1",
      username: "doc",
      email: "doc@example.com",
      role: "doctor",
    });

    const res = await svc.getMyProfile("d1");
    expect(res).toEqual({ id: "d1", username: "doc", email: "doc@example.com", role: "doctor" });
    expect(mockUsers.getPublicById).toHaveBeenCalledWith("d1");
  });

  it("updateMyProfile returns public fields from updated user", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);
    mockUsers.updateUser.mockResolvedValueOnce({
      id: "d1",
      username: "newdoc",
      email: "new@example.com",
      role: "doctor",
      password_hash: "…",
      token_version: 0,
      created_at: "x",
      updated_at: "y",
    });

    const res = await svc.updateMyProfile("d1", { username: "newdoc", email: "new@example.com" });
    expect(res).toEqual({
      id: "d1",
      username: "newdoc",
      email: "new@example.com",
      role: "doctor",
    });
    expect(mockUsers.updateUser).toHaveBeenCalledWith("d1", {
      username: "newdoc",
      email: "new@example.com",
    });
  });

  it("updateMyProfile returns null when user not found", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);
    mockUsers.updateUser.mockResolvedValueOnce(null);

    const res = await svc.updateMyProfile("d1", { username: "x" });
    expect(res).toBeNull();
  });

  it("specializations list/replace/remove delegate to repo", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);

    mockDocSpecs.listForDoctor.mockResolvedValueOnce([{ id: "ds1" }]);
    expect(await svc.listMySpecializations("d1")).toEqual([{ id: "ds1" }]);

    mockDocSpecs.replaceAll.mockResolvedValueOnce([{ id: "ds2" }]);
    expect(await svc.replaceMySpecializations("d1", ["s1", "s2"])).toEqual([{ id: "ds2" }]);
    expect(mockDocSpecs.replaceAll).toHaveBeenCalledWith("d1", ["s1", "s2"]);

    mockDocSpecs.removeOne.mockResolvedValueOnce(true);
    expect(await svc.removeMySpecialization("d1", "s1")).toBe(true);
    expect(mockDocSpecs.removeOne).toHaveBeenCalledWith("d1", "s1");
  });

  it("weekly availability list/upsert delegate to repo", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);

    mockWeekly.list.mockResolvedValueOnce([{ id: "wa1", weekday: 1 }]);
    expect(await svc.listMyWeeklyAvailability("d1")).toEqual([{ id: "wa1", weekday: 1 }]);

    const rows = [
      {
        weekday: 1,
        start_time: "09:00:00",
        end_time: "12:00:00",
        slot_duration_mins: 30,
        timezone: "Europe/Istanbul",
      },
    ];
    mockWeekly.upsert.mockResolvedValueOnce([{ id: "wa2" }]);

    expect(await svc.upsertMyWeeklyAvailability("d1", rows)).toEqual([{ id: "wa2" }]);
    expect(mockWeekly.upsert).toHaveBeenCalledWith("d1", rows);
  });

  it("slot exceptions list/create/remove delegate to repo", async () => {
    const db = makeDb();
    const svc = makeDoctorsService(db);

    mockEx.list.mockResolvedValueOnce([{ id: "se1" }]);
    expect(await svc.listMySlotExceptions("d1")).toEqual([{ id: "se1" }]);

    const data = { day: "2026-01-15", full_day: true, reason: "conf" };
    mockEx.create.mockResolvedValueOnce({ id: "se2" });
    expect(await svc.createMySlotException("d1", data)).toEqual({ id: "se2" });
    expect(mockEx.create).toHaveBeenCalledWith("d1", data);

    mockEx.remove.mockResolvedValueOnce(true);
    expect(await svc.removeMySlotException("d1", "se2")).toBe(true);
    expect(mockEx.remove).toHaveBeenCalledWith("se2", "d1");
  });
});
