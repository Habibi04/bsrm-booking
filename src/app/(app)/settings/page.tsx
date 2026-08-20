import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireRole([Role.SUPER_ADMIN]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings area</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
