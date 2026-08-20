"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    // signIn()'s redirectTo triggers a successful login by throwing a
    // special NEXT_REDIRECT error internally - that's how redirects work
    // from inside a Server Action. A catch block that doesn't distinguish
    // error types would catch that too, silently swallowing the redirect
    // and making a successful login look like nothing happened.
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
