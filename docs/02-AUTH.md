# Authentication

## Table of Contents
- [Authentication Flow](#authentication-flow)
    - [Sign Up](#sign-up)
    - [Login](#login)
    - [Profile](#profile)
    - [Refresh](#refresh)
    - [Logout](#logout)

 ## Authentication Flow

 	1.	Sign Up → password hashed with scrypt → user saved to data/users.json.
	2.	Login → on valid credentials:
	   • Access token (JWT), lifetime 15 minutes (configurable), returned in response.
	   • Refresh token (random 32 bytes), stored hashed server-side and set to the client as an HttpOnly cookie.
	3.	Protected routes (/profile) → client sends Authorization: Bearer <accessToken>; middleware verifies signature/claims and sets req.user.
	4.	Refresh → when access token expires, client calls POST /auth/refresh; server validates the cookie, rotates the refresh token, and returns a new access token.
	5.	Logout → server revokes the refresh token and clears the cookie.
        • With the current design, any already-issued access token remains usable until it expires.

 ### Sign Up

 POST `http://localhost:3000/auth/signup`

 Body:
 ```
 {
  "email": "daniiar1@gmail.com",
  "password": "pass1234",
  "role": "doctor" | "patient"
}
```
#### Signup Responses
1. Created:`201`
```
{
  "id": "a98c6cc0-37b7-4f9e-84d8-27c0553f66d2",
  "email": "daniiar1@gmail.com",
  "role": "doctor" | "patient"
}
```
2. Conflict:`409`
```
{
  "error": "Email already in use"
}
```
3. Bad Request: `400`
```
{
  "error": "email, password, role(doctor|patient) required"
}
```


 ### Login

POST  `http://localhost:3000/auth/login` 

Body:
 ```
{
  "email": "daniiar1@gmail.com",
  "password": "pass1234"
}
```
#### Login Responses

1. OK: `200`
```
{
  "message": "You signed in as doctor", //patient
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwM2UzNDNkZC0xMTE4LTRmMGQtODg1NS1kMDc5ZTQwMjQ5OWMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzU2MTIzNjg3LCJleHAiOjE3NTYxMjQ1ODcsImlzcyI6Imhvc3BpdGFsLWFwaSJ9.dS7IgdVI2ITMhtO7r06UtAYR9wM8PEl3aaMQlpQ1yXg"
}
```
Also sets an HttpOnly refreshToken cookie.

2. Unauthorized: `401`
```
{
  "error": "Invalid credentials"
}
```

3. Bad Request `400`
```
{
  "error": "email & password required"
}
```

 ### Profile (confirm if JWT token works as expected)
GET `http://localhost:3000/profile` 

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwM2UzNDNkZC0xMTE4LTRmMGQtODg1NS1kMDc5ZTQwMjQ5OWMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzU2MTI0Njk3LCJleHAiOjE3NTYxMjU1OTcsImlzcyI6Imhvc3BpdGFsLWFwaSJ9.KGWSGir1wLsHB0mSSWnQ7JpSvADG0YUW1FKUZfJgWmU
```

#### Profile Responses

1. OK:`200`
```
{
  "id": "03e343dd-1118-4f0d-8855-d079e402499c",
  "role": "doctor"
}
```

2. Unauthorized: `401`
```
{
  "error": "Invalid/expired token"
}
```

### Refresh 
Access tokens are short-lived (~15 minutes).When a protected call returns 401 due to an expired token, obtain a new one:

POST `http://localhost:3000/auth/refresh`

The browser automatically sends the HttpOnly refreshToken cookie


#### Refresh Responses
1. OK: `200`
```
{ "accessToken": "<new JWT>" }
```

2. Unauthorized: `401`
```
{ "error": "Missing refresh token" }
or
{ error: "Invalid/expired refresh token" }
```

Note: /auth/refresh is an API call, not a page you navigate to. Typical client logic: on 401 → call refresh → retry original request with the new access token.


### Logout

POST `http://localhost:3000/auth/logout`

Revokes the current refresh token and clears the cookie.

#### Logout Response:
  No content: `204`

Behavior:
	
  • With the current design, an already-issued access token may still work until it expires (client should discard it on logout).