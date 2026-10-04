import { z } from "zod";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least one letter and one number",
      ),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const authValidation = {
  registerSchema,
  loginSchema,
};
