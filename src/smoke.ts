
import "dotenv/config";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@gmail.com";
const adminPass = process.env.ADMIN_PASSWORD ?? "ChangeIt1234!";
const doctorEmail = process.env.DOCTOR_EMAIL ?? "dr.house@example.com";
const doctorPass = process.env.DOCTOR_PASSWORD ?? "VerySecret123!";
const patientEmail = process.env.PATIENT_EMAIL ?? "john.doe@example.com";
const patientPass = process.env.PATIENT_PASSWORD ?? "VerySecret123!";

async function post(path: string, body: any, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json };
}

async function get(path: string, token?: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json };
}

async function patch(path: string, body: any, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json };
}

async function put(path: string, body: any, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json };
}

async function smoke() {
  console.log(`→ Base: ${base}`);

  // Health
  console.log("Health…");
  const h = await get("/health");
  if (h.status !== 200) {
    throw new Error("Health failed");
  }

  // Admin login (assumes you seeded admin)
  console.log("Admin login…");
  const aLogin = await post("/auth/login", {
    email: adminEmail,
    password: adminPass,
  });
  if (aLogin.status !== 200) {
    throw new Error("Admin login failed");
  }
  const adminToken = aLogin.json.accessToken as string;

  // List specs (pick first)
  console.log("List specializations…");
  const specs = await get("/specializations");
  if (!Array.isArray(specs.json) || specs.json.length === 0) {
    throw new Error("No specializations seeded");
  }
  const specId = specs.json[0].id as string;

  // Sign up doc/patient (ignore 409)
  console.log("Signup doctor…");
  await post("/auth/signup", {
    username: "Dr House",
    email: doctorEmail,
    password: doctorPass,
  });
  console.log("Signup patient…");
  await post("/auth/signup", {
    username: "John Doe",
    email: patientEmail,
    password: patientPass,
  });

  // Admin: list users, find doctor id, promote
  console.log("Admin list users…");
  const list = await get("/admin/users?limit=100", adminToken);
  const doctor = Array.isArray(list.json.items)
    ? list.json.items.find((u: any) => u.email === doctorEmail)
    : null;
  if (!doctor) {
    throw new Error("Doctor not found in list");
  }
  const promote = await patch(`/admin/users/${doctor.id}/role`, { role: "doctor" }, adminToken);
  if (promote.status !== 200) {
    throw new Error("Promote failed");
  }

  // Doctor login
  console.log("Doctor login…");
  const dLogin = await post("/auth/login", {
    email: doctorEmail,
    password: doctorPass,
  });
  if (dLogin.status !== 200) {
    throw new Error("Doctor login failed");
  }
  const doctorToken = dLogin.json.accessToken as string;

  // Doctor set specializations
  console.log("Doctor set specializations…");
  const setSpecs = await put(
    "/doctors/me/specializations",
    { specializationIds: [specId] },
    doctorToken,
  );
  if (setSpecs.status >= 300) {
    throw new Error("Set specializations failed");
  }

  // Doctor weekly availability
  console.log("Doctor weekly availability…");
  const wa = await put(
    "/doctors/me/weekly-availability",
    {
      items: [
        {
          weekday: 1,
          start_time: "09:00:00",
          end_time: "12:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
        },
        {
          weekday: 3,
          start_time: "14:00:00",
          end_time: "17:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
        },
      ],
    },
    doctorToken,
  );
  if (wa.status !== 200) {
    throw new Error("Weekly availability failed");
  }

  // Regenerate slots for next 4 weeks
  console.log("Regenerate slots…");
  const regen = await post(
    `/doctors/me/slots/regenerate?weeks=4&specializationId=${specId}`,
    {},
    doctorToken,
  );
  if (regen.status !== 200) {
    throw new Error("Regenerate slots failed");
  }

  // Patient login
  console.log("Patient login…");
  const pLogin = await post("/auth/login", {
    email: patientEmail,
    password: patientPass,
  });
  if (pLogin.status !== 200) {
    throw new Error("Patient login failed");
  }
  const patientToken = pLogin.json.accessToken as string;

  // Patient search slots (next 14 days)
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 14 * 86400000).toISOString();
  console.log("Search slots…");
  const search = await get(
    `/patients/me/slots/search?specializationId=${specId}&from=${encodeURIComponent(
      from,
    )}&to=${encodeURIComponent(to)}`,
    patientToken,
  );
  if (search.status !== 200 || !search.json.items?.length) {
    throw new Error("No slots found");
  }
  const slotId = search.json.items[0].id as string;

  // Patient book
  console.log("Book appointment…");
  const book = await post(
    "/patients/me/appointments",
    { slotId, symptoms: "Chest pain" },
    patientToken,
  );
  if (book.status !== 201) {
    throw new Error("Booking failed");
  }

  console.log("Smoke test passed");
}

smoke().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exit(1);
});
