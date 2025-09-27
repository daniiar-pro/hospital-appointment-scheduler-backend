# Authentication

## Table of Contents
- [Authentication Flow](#authentication-flow)
  - [Sign Up](#sign-up)
  - [Login](#login)
  - [Profile](#profile)
  - [Refresh](#refresh)
  - [Logout](#logout)

---

## Authentication Flow

1. **Sign Up** → password is hashed (scrypt) → **user saved in Postgres (`users` table)**.  
   - Role on signup is **always `patient`** (admin can promote later).
2. **Login** → on valid credentials:
   - **Access token (JWT)**, ~15 minutes (configurable), returned in the response body.
   - **Refresh token (opaque, random)**, stored **hashed** in Postgres (`refresh_tokens` table) and issued to the client as an **HttpOnly cookie**.
3. **Protected routes** (e.g. `/auth/profile`) → client sends `Authorization: Bearer <accessToken>`; middleware verifies signature/claims and sets `req.user`.
4. **Refresh** → when access token expires, client calls `POST /auth/refresh`; server validates the cookie, **rotates** the refresh token, sets a new cookie, and returns a new access token.
5. **Logout** → server **revokes** the refresh token and **clears the cookie**.  
   - Already-issued access tokens can still work until they expire (client should discard them on logout).

> **JWT claims:** `{ sub: <userId>, role: "patient"|"doctor"|"admin", iat, exp, iss: "hospital-api" }`

---

## Sign Up

**POST** `http://localhost:3000/auth/signup`

**Body**
```json
{
  "username": "Dr House",
  "email": "dr.house@example.com",
  "password": "VerySecret123!"
}
```
Note: A role field in the request (if sent) is ignored; every new user starts as patient.

### Responses
	
1.	201 Created
```

{
  "id": "a98c6cc0-37b7-4f9e-84d8-27c0553f66d2",
  "username": "Dr House",
  "email": "dr.house@example.com",
  "role": "patient"
}
```

2. 409 Conflict
```
{ "error": "Email already in use" }
```

3.	400 Bad Request (Zod validation shape)

```
{
  "message": "Validation failed",
  "errors": [
    { "path": "email", "code": "invalid_string", "message": "Invalid email" }
  ]
}
```

⸻

# Login

POST `http://localhost:3000/auth/login`

Body
```
{
  "email": "dr.house@example.com",
  "password": "VerySecret123!"
}
```

### Responses

1. 200 OK

```
{
  "message": "You signed in as patient",
  "accessToken": "<JWT>"
}
```
Also sets an HttpOnly cookie named refreshToken.

2.	401 Unauthorized

```
{ "error": "Invalid credentials" }
```

3.	400 Bad Request (Zod validation)

```
{
  "message": "Validation failed",
  "errors": [
    { "path": "password", "code": "too_small", "message": "String must contain at least 8 character(s)" }
  ]
}
```

⸻

# Profile

GET `http://localhost:3000/auth/profile`

Headers

Authorization: Bearer <accessToken>

### Responses
1. 200 OK

```
{
  "id": "03e343dd-1118-4f0d-8855-d079e402499c",
  "role": "patient"
}
```

2.	401 Unauthorized

```
{ "error": "Invalid/expired token" }
```

⸻

### Refresh

Access tokens are short-lived (~15 minutes). When you receive a 401 due to an expired token, obtain a new one:

POST `http://localhost:3000/auth/refresh`

The browser/client automatically sends the HttpOnly refreshToken cookie.

### Responses

1.	200 OK
```
{ "accessToken": "<new JWT>" }
```

2. 401 Unauthorized

```
{ "error": "Missing refresh token" }
```
or
```
{ "error": "Invalid/expired refresh token" }
```
On success, the server rotates the refresh token: a new cookie is set and the old one is revoked server-side.

⸻

# Logout

POST `http://localhost:3000/auth/logout`

Revokes the current refresh token and clears the cookie.

### Response

1.	204 No Content

Note: An already-issued access token may remain valid until it expires. Clients should discard any cached access token upon logout.


