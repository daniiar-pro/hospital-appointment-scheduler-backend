# Specializations (Public)

> Public endpoint to read the catalog of medical specializations available for doctors and patients to reference.
>
> - No authentication required.
> - Read-only (full CRUD for admins is documented in the **Admin** section).

## Table of Contents
- [List All Specializations](#list-all-specializations)
- [Notes](#notes)

---

## List All Specializations

**GET** `http://localhost:3000/specializations`

**Query Params**  
_None_

### Response

- **200 OK**
```
[
  {
    "id": "4e3b8e19-5c9f-4a67-9a7c-0c7b8e0f1c33",
    "name": "cardiology",
    "description": "Heart and circulatory system"
  },
  {
    "id": "c2b8a7f0-1b4f-4e4d-bf5e-2a5fbb5f2a1e",
    "name": "dermatology",
    "description": "Skin, hair, and nails"
  }
]
```


**Errors**
- **500 Internal Server Error**
```
{ "error": "Internal error" }
```



Notes

	•	The list is managed by admins via /admin/specializations (create, update, delete).

	•	Patients use these IDs when searching for free slots.
	
    •	Doctors select their own specializations from this catalog.

