# Doctor (Me) API

> All **/doctors/me/** routes require:
>
> - A valid **JWT access token** in the `Authorization` header.
> - The caller’s role must be **doctor**.
>
> **Header**
> ```
> Authorization: Bearer <accessToken>
> ```

## Table of Contents
- [Profile](#profile)
  - [Get My Profile](#get-my-profile)
  - [Update My Profile](#update-my-profile)
- [Appointments (read-only for doctor)](#appointments-read-only-for-doctor)
- [My Specializations](#my-specializations)
  - [List My Specializations](#list-my-specializations)
  - [Replace My Specializations](#replace-my-specializations)
  - [Remove One Specialization](#remove-one-specialization)
- [Weekly Availability](#weekly-availability)
  - [List Weekly Availability](#list-weekly-availability)
  - [Replace Weekly Availability](#replace-weekly-availability)
- [Slot Exceptions (day-offs / partial blocks)](#slot-exceptions-day-offs--partial-blocks)
  - [List Slot Exceptions](#list-slot-exceptions)
  - [Create Slot Exception](#create-slot-exception)
  - [Delete Slot Exception](#delete-slot-exception)
- [Generate Availability Slots](#generate-availability-slots)

---

## Profile

### Get My Profile
**GET** `http://localhost:3000/doctors/me/profile`

**Responses**

- **200 OK**
```
{ "id": "f0a1...", "username": "Dr House", "email": "dr.house@example.com", "role": "doctor" }
```

- **401/403 — missing/invalid token or non-doctor.**

⸻

### Update My Profile

PATCH `http://localhost:3000/doctors/me/`

Body (at least one field)
```
{
  "username": "Gregory House",
  "email": "house@example.com"
}
```
**Responses**
- **200 OK**

```
{ "id": "f0a1...", "username": "Gregory House", "email": "house@example.com", "role": "doctor" }
```

- **400 Bad Request (Zod validation)**
```
{
  "message": "Validation failed",
  "errors": [{ "path": "", "message": "Provide at least one field" }]
}
```

- **409 Conflict**
```
{ "error": "Email already in use" }
```

⸻

## Appointments (read-only for doctor)



GET `http://localhost:3000/doctors/me/appointments?from=ISO&to=ISO`

Query Params
	•	from — ISO datetime (optional)
	•	to — ISO datetime (optional)

**Responses**
- **200 OK**
```
[
  {
    "id": "a1b2...",
    "availability_slot_id": "s1",
    "patient_id": "p1",
    "status": "confirmed",
    "symptoms": "Chest pain",
    "notes": null,
    "booked_at": "2025-09-25T10:00:00.000Z",
    "canceled_at": null,
    "start_time": "2025-10-01T09:00:00.000Z",
    "end_time": "2025-10-01T09:30:00.000Z",
    "specialization_id": "spec-1"
  }
]
```



## My Specializations

### List My Specializations

GET `http://localhost:3000/doctors/me/specializations`

**Responses**
- **200 OK**
```
[
  {
    "id": "pair-1",
    "doctor_id": "doc-1",
    "specialization_id": "spec-1",
    "created_at": "2025-09-01T12:00:00.000Z",
    "name": "cardiology",
    "description": "Heart & vessels"
  }
]
```


⸻

### Replace My Specializations

PUT `http://localhost:3000/doctors/me/specializations`

Body
```
{
  "specializationIds": ["spec-1", "spec-2"]
}
```

**Responses**
- **200 OK**
```
{
  "assigned": 2,
  "items": [
    { "id": "pair-1", "doctor_id": "doc-1", "specialization_id": "spec-1", "created_at": "..." },
    { "id": "pair-2", "doctor_id": "doc-1", "specialization_id": "spec-2", "created_at": "..." }
  ]
}
```

-**400 Bad Request**

```
{
  "message": "Validation failed",
  "errors": [{ "path": "specializationIds", "message": "Required" }]
}
```



### Remove One Specialization

DELETE `http://localhost:3000/doctors/me/specializations/:specId`

**Responses**
- **204 No Content**
- **404 Not Found**
```
{ "error": "Pair not found" }
```



## Weekly Availability

A weekly template is used to generate concrete availability slots later.
Time fields are strings: "HH:MM" or "HH:MM:SS".
weekday uses 0..6 where 0=Sunday.

### List Weekly Availability

GET `http://localhost:3000/doctors/me/weekly-availability`

**Responses**
- **200 OK**
```
[
  {
    "id": "w1",
    "doctor_id": "doc-1",
    "weekday": 1,
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "slot_duration_mins": 30,
    "timezone": "Europe/Istanbul",
    "created_at": "2025-09-01T12:00:00.000Z",
    "updated_at": "2025-09-01T12:00:00.000Z"
  }
]
```

⸻

### Replace Weekly Availability

PUT `http://localhost:3000/doctors/me/weekly-availability`
Body
```
{
  "items": [
    {
      "weekday": 1,
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "slot_duration_mins": 30,
      "timezone": "Europe/Istanbul"
    },
    {
      "weekday": 3,
      "start_time": "14:00:00",
      "end_time": "17:00:00",
      "slot_duration_mins": 30,
      "timezone": "Europe/Istanbul"
    }
  ]
}
```

**Responses**
- **200 OK**
```
{
  "saved": 2,
  "items": [
    {
      "id": "w1",
      "doctor_id": "doc-1",
      "weekday": 1,
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "slot_duration_mins": 30,
      "timezone": "Europe/Istanbul",
      "created_at": "2025-09-01T12:00:00.000Z",
      "updated_at": "2025-09-01T12:00:00.000Z"
    },
    {
      "id": "w2",
      "doctor_id": "doc-1",
      "weekday": 3,
      "start_time": "14:00:00",
      "end_time": "17:00:00",
      "slot_duration_mins": 30,
      "timezone": "Europe/Istanbul",
      "created_at": "2025-09-01T12:00:00.000Z",
      "updated_at": "2025-09-01T12:00:00.000Z"
    }
  ]
}
```

- **400 Bad Request (Zod validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "items.0.end_time", "message": "end_time must be > start_time" }
  ]
}
```




## Slot Exceptions (day-offs / partial blocks)
	•	full_day = true → blocks the entire day.
	•	full_day = false → you must provide both start_time and end_time (time range is blocked).

### List Slot Exceptions

GET `http://localhost:3000/doctors/me/slot-exceptions`

**Responses**
- **200 OK**
```
[
  {
    "id": "ex1",
    "doctor_id": "doc-1",
    "day": "2026-01-15",
    "start_time": null,
    "end_time": null,
    "full_day": true,
    "reason": "Conference"
  }
]

```


⸻

### Create Slot Exception

POST `http://localhost:3000/doctors/me/slot-exceptions`

Body (examples)
	•	Full-day:
```
{
  "day": "2026-01-15",
  "full_day": true,
  "reason": "Conference"
}
```

	•	Partial block:
```
{
  "day": "2026-01-16",
  "full_day": false,
  "start_time": "10:00:00",
  "end_time": "12:00:00",
  "reason": "Surgery"
}
```

**Responses**
- **201 Created**
```
{
  "id": "ex2",
  "doctor_id": "doc-1",
  "day": "2026-01-16",
  "start_time": "10:00:00",
  "end_time": "12:00:00",
  "full_day": false,
  "reason": "Surgery"
}
```
- **400 Bad Request**
```
{
  "message": "Validation failed",
  "errors": [
    { "message": "Provide start/end for partial; none for full_day" }
  ]
}
```



### Delete Slot Exception

DELETE `http://localhost:3000/doctors/me/slot-exceptions/:id`

**Responses**
- **204 No Content**
- **404 Not Found**
```
{ "error": "Not found" }
```



## Generate Availability Slots

Generates concrete bookable slots from your weekly availability for a future window.

POST `http://localhost:3000/doctors/me/slots/regenerate?weeks=6&specializationId=<uuid>`

Query Params
	•	weeks — 1..26 (default 6)
	•	specializationId — optional; required if you have multiple specializations (error otherwise). If you have exactly one specialization, it will be used automatically.

**Responses**
- **200 OK**
```
{ "inserted": 24 }
```

- **400 Bad Request (validation)**
```
{
  "message": "Validation failed",
  "errors": [{ "path": "weeks", "message": "Number must be greater than or equal to 1" }]
}
```

- **400 Bad Request (missing specialization when multiple)**

```
{ "error": "Doctor has multiple specialization; provide specializationId" }
```




