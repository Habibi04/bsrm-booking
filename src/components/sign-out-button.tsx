import { Button } from "@/components/ui/button";
import { signOut } from "@/auth";

export function SignOutButton() {
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline">
        Sign out
      </Button>
    </form>
  );
}
