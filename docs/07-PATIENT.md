# Patient (Me) API

> All **/patients/me/** routes require:
>
> - A valid **JWT access token** in the `Authorization` header.
> - The caller’s role must be **patient**.
>
> **Header**
> ```
> Authorization: Bearer <accessToken>
> ```

## Table of Contents
- [Search Free Slots](#search-free-slots)
- [Book Appointment](#book-appointment)
- [List My Appointments](#list-my-appointments)
- [Cancel My Appointment](#cancel-my-appointment)

---

## Search Free Slots

**GET** `http://localhost:3000/patients/me/slots/search?specializationId=<uuid>&from=<ISO>&to=<ISO>&limit=<1..100>&offset=<n>`

**Query Params**
- `specializationId` *(required)* — UUID of specialization to search.
- `from` *(required)* — ISO datetime (UTC).
- `to` *(required)* — ISO datetime (UTC).
- `limit` *(optional)* — 1..100 (default server-side 20).
- `offset` *(optional)* — 0..N (default 0).

**Responses**

- **200 OK**
```
{
  "items": [
    {
      "id": "slot-uuid",
      "doctor_id": "doc-uuid",
      "specialization_id": "spec-uuid",
      "start_time": "2025-10-01T09:00:00.000Z",
      "end_time": "2025-10-01T09:30:00.000Z",
      "duration_mins": 30,
      "is_booked": false,
      "source": "generated",
      "created_at": "2025-09-20T12:00:00.000Z"
    }
  ],
  "total": 24,
  "limit": 20,
  "offset": 0
}
```

- **400 Bad Request (Zod validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "from", "message": "Invalid datetime" }
  ]
}
```




## Book Appointment

POST `http://localhost:3000/patients/me/appointments`

Body

```
{
  "slotId": "slot-uuid",
  "symptoms": "Chest pain for two days"
}
```

**Responses**
- **201 Created**
```
{
  "id": "appt-uuid",
  "availability_slot_id": "slot-uuid",
  "patient_id": "patient-uuid",
  "status": "confirmed",
  "symptoms": "Chest pain for two days",
  "notes": null,
  "booked_at": "2025-09-25T10:00:00.000Z",
  "canceled_at": null
}
```

- **404 Not Found**
```
{ "error": "Slot not found" }
```

- **409 Conflict**
```
{ "error": "Slot already booked" }
```
- **400 Bad Request (validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "slotId", "message": "Invalid uuid" }
  ]
}
```




## List My Appointments

GET `http://localhost:3000/patients/me/appointments?from=<ISO>&to=<ISO>`

Query Params
	•	from (optional) — ISO datetime (UTC) lower bound (slot start).
	•	to (optional) — ISO datetime (UTC) upper bound (slot start).

**Responses**
- **200 OK**
```
[
  {
    "id": "appt-uuid",
    "availability_slot_id": "slot-uuid",
    "patient_id": "patient-uuid",
    "status": "confirmed",
    "symptoms": "Chest pain for two days",
    "notes": null,
    "booked_at": "2025-09-25T10:00:00.000Z",
    "canceled_at": null,

    "start_time": "2025-10-01T09:00:00.000Z",
    "end_time": "2025-10-01T09:30:00.000Z",
    "doctor_id": "doc-uuid",
    "specialization_id": "spec-uuid"
  }
]
```



## Cancel My Appointment

PATCH `http://localhost:3000/patients/me/appointments/:id/cancel`
**Responses**
- **204 No Content**
- **404 Not Found**
```
{ "error": "Appointment not found" }
```

- **409 Conflict**
```
{ "error": "Already cancelled" }
```
- **400 Bad Request**
```
{ "error": "Cannot cancel" }
```
Notes:

	- Times are RFC 3339 / ISO strings (UTC).

	- Booking is atomic: the slot is marked booked and an appointment is created in a single statement to avoid race conditions.

