"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginState = { error?: string };

// loginAction (actions.ts) only accepts FormData, per spec. useActionState
// requires an action shaped (previousState, formData) => state, so this
// thin wrapper adapts one to the other without changing loginAction's own
// signature.
async function runLoginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = await loginAction(formData);
  return result ?? {};
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(runLoginAction, {});

  return (
    <div className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
