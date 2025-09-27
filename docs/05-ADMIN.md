# Admin API

 All
  ###  **/admin** routes require:
 ```
 - A valid **JWT access token** in the `Authorization` header.
 - The caller’s role must be **admin**.

 **Header**
 Authorization: Bearer <accessToken>
 ```


## Table of Contents
- [Users](#users)
  - [List Users](#list-users)
  - [Get User by ID](#get-user-by-id)
  - [Change User Role](#change-user-role)
  - [Admin Update User Profile](#admin-update-user-profile)
  - [Logout User From All Devices](#logout-user-from-all-devices)
  - [Delete User](#delete-user)
- [Specializations](#specializations)
  - [List Specializations](#list-specializations)
  - [Create Specialization](#create-specialization)
  - [Update Specialization](#update-specialization)
  - [Delete Specialization](#delete-specialization)

---

## Users

### List Users
**GET** `http://localhost:3000/admin/users`

**Query Params**
- `role` — `"patient" | "doctor" | "admin"` (optional)
- `q` — string, searches `username` or `email` (optional)
- `limit` — `1..100` (default `20`)
- `offset` — `0..` (default `0`)
- `order` — `"created_desc" | "created_asc"` (default `created_desc`)

**Example**

GET `http://localhost:3000/admin/users`

**Responses**

- **200 OK**
```
{
  "items": [
    { "id": "f0a1...", "username": "Dr House", "email": "dr.house@example.com", "role": "doctor" }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

- **400 Bad Request (Zod query validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "limit", "message": "Number must be greater than or equal to 1" }
  ]
}
```

- **401/403 — missing/invalid token or non-admin.**




### Get User by ID

GET `http://localhost:3000/admin/users/:id`

**Responses**
- **200 OK**
```
{ "id": "f0a1...", "username": "John Doe", "email": "john.doe@example.com", "role": "patient" }
```
- **404 Not Found**
```
{ "error": "User not found" }
```




### Change User Role

PATCH `http://localhost:3000/admin/users/:id/role`

Body
```
{ "role": "patient" }
```

Allowed values: "patient" | "doctor" | "admin".

**Responses**

- **200 OK**
```
{ "id": "f0a1...", "username": "John Doe", "email": "john.doe@example.com", "role": "patient" }
```

- **400 Bad Request (Zod validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "role", "message": "Invalid enum value" }
  ]
}
```

- **404 Not Found**
```
{ "error": "User not found" }
```




### Admin Update User Profile

PATCH `http://localhost:3000/admin/users/:id`

Body (at least one field required)
```
{
  "username": "New Name",
  "email": "new.email@example.com",
  "role": "doctor"
}

```

**Responses**
- **200 OK**
```
{ "id": "f0a1...", "username": "New Name", "email": "new.email@example.com", "role": "doctor" }
```

- **400 Bad Request (no fields / invalid)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "", "message": "Provide at least one field" }
  ]
}
```

- **409 Conflict (email unique violation)**
```
{ "error": "Email already in use" }
```

- **404 Not Found**
```
{ "error": "User not found" }
```




### Logout User From All Devices

POST `http://localhost:3000/admin/users/:id/logout-all`

Revokes all active refresh tokens for the user.

**Responses**
- **200 OK**
```
{ "revoked": 3 }
```
revoked is the number of active tokens that were revoked.



### Delete User

DELETE `http://localhost:3000/admin/users/:id`

**Responses**

- **204 No Content**

- **404 Not Found**
```
{ "error": "User not found or cannot delete" }
```



# Specializations

Admin can curate the catalog of doctor specializations (used by doctors to set their profile and by patients to search).

### List Specializations

GET `http://localhost:3000/admin/specializations`

**Responses**
- **200 OK**
```
[
  { "id": "a1b2...", "name": "cardiology", "description": "Heart & vessels" },
  { "id": "c3d4...", "name": "dermatology", "description": null }
]
```




### Create Specialization

POST `http://localhost:3000/admin/specializations`

Body

```
{
  "name": "neurology",
  "description": "Nervous system"
}
```

**Responses**

- **201 Created**
```
{ "id": "e5f6...", "name": "neurology", "description": "Nervous system" }
```

- **400 Bad Request (Zod validation)**

```
{
  "message": "Validation failed",
  "errors": [
    { "path": "name", "message": "String must contain at least 2 character(s)" }
  ]
}
```

- **409 Conflict (name unique)**
```
{ "error": "Specialization exists" }
```



### Update Specialization

PATCH `http://localhost:3000/admin/specializations/:id`

Body (at least one field)

```
{
  "name": "neurosurgery",
  "description": "Surgical subspecialty"
}
```

**Responses**
- **200 OK**
```
{ "id": "e5f6...", "name": "neurosurgery", "description": "Surgical subspecialty" }
```
- **400 Bad Request (Zod validation)**
```
{
  "message": "Validation failed",
  "errors": [
    { "path": "", "message": "Provide at least one field" }
  ]
}
```


- **404 Not Found**
```
{ "error": "Not found" }
```
- **409 Conflict (name unique)**
```
{ "error": "Specialization exists" }
```



### Delete Specialization

DELETE `http://localhost:3000/admin/specializations/:id`

**Responses**
- **204 No Content**
- **404 Not Found**
```
{ "error": "Not found" }
```
- **409 Conflict (in use by doctors)**
```
{ "error": "Specialization in use" }
```
