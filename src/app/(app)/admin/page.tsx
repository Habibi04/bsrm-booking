import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/session";

export default async function AdminPage() {
  const user = await requireRole([Role.LOCAL_ADMIN, Role.SUPER_ADMIN]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Admin area</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
