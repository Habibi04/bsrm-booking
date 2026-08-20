import type { ReactNode } from "react";
import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  const isLocalOrSuperAdmin =
    user.role === Role.LOCAL_ADMIN || user.role === Role.SUPER_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium">
            Dashboard
          </Link>
          {isLocalOrSuperAdmin && (
            <Link href="/admin" className="text-sm font-medium">
              Admin
            </Link>
          )}
          {isSuperAdmin && (
            <Link href="/settings" className="text-sm font-medium">
              Settings
            </Link>
          )}
        </div>
        <SignOutButton />
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
