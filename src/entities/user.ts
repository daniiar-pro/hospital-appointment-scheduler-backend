import { z } from "zod";
import type { UserRow } from "../database/types.js";

const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;

export const roleEnum = z.enum(["admin", "doctor", "patient"]);
export type Role = z.infer<typeof roleEnum>;

export const userSchema = z.object({
  id: z.uuid(),
  username: z.string().min(1, { message: "username cannot be empty" }).max(50),
  email: z
    .string()
    .min(1, { message: "email cannot be empty" })
    .max(254)
    .trim()
    .regex(emailRegex, { message: "Incorrect email format!" }),
  role: roleEnum,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type UserSchemaDto = z.infer<typeof userSchema>;

export const userPublicSchema = userSchema.pick({
  id: true,
  username: true,
  email: true,
  role: true,
});

export type UserPublic = z.infer<typeof userPublicSchema>;

export const userPrivateSchema = userSchema.extend({
  tokenVersion: z.number().int().nonnegative(),
});
export type PrivateUser = z.infer<typeof userPrivateSchema>;

export function mapUserRow(row: UserRow): UserSchemaDto {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserRowToPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
  };
}

export function mapUserRowToPrivate(row: UserRow): PrivateUser {
  return {
    ...mapUserRow(row),
    tokenVersion: row.token_version,
  };
}

export const signupDto = z.object({
  username: z.string().min(1, { message: "username cannot be empty" }).max(50),
  email: z
    .string()
    .min(1, { message: "email cannot be empty" })
    .max(254)
    .trim()
    .regex(emailRegex, { message: "Incorrect email format!" }),
  password: z
    .string()
    .min(8, { message: "password must be at least 8 characters" })
    .max(72, { message: "password too long" })
    .regex(passwordRegex, {
      message: "password must include lowercase, uppercase, number, and special character",
    }),
});
export type SignupDto = z.infer<typeof signupDto>;

export const adminCreateUserDto = z.object({
  username: z.string().min(1, { message: "username cannot be empty" }).max(50),
  email: z
    .string()
    .min(1, { message: "email cannot be empty" })
    .max(254)
    .trim()
    .regex(emailRegex, { message: "Incorrect email format!" }),
  password: z
    .string()
    .min(8, { message: "password must be at least 8 characters" })
    .max(72, { message: "password too long" })
    .regex(passwordRegex, {
      message: "password must include lowercase, uppercase, number, and special character",
    }),
  role: roleEnum,
});

export type AdminCreateUserDto = z.infer<typeof adminCreateUserDto>;

export const loginDto = z.object({
  email: z
    .string()
    .min(1, { message: "email cannot be empty" })
    .max(254)
    .trim()
    .regex(emailRegex, { message: "Incorrect email format!" }),
  password: z.string().min(1, { message: "password cannot be empty" }),
});
export type LoginDto = z.infer<typeof loginDto>;

export const changePasswordDto = z
  .object({
    currentPassword: z.string().min(8).max(72).regex(passwordRegex, {
      message: "currentPassword must include lowercase, uppercase, number, and special character",
    }),
    newPassword: z
      .string()
      .min(8, { message: "newPassword must be at least 8 characters" })
      .max(72, { message: "newPassword must be at most 72 characters" })
      .regex(passwordRegex, {
        message: "newPassword must include lowercase, uppercase, number, and special character",
      }),
    confirmNewPassword: z.string().min(8).max(72),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "newPassword and confirmNewPassword must match",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;

export const updateProfileDto = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z
    .string()
    .max(254)
    .regex(emailRegex, { message: "Incorrect email format!" })
    .transform((s) => s.toLowerCase())
    .optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
