import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p>{"You don't have permission to view this page."}</p>
      <Link href="/dashboard" className="underline">
        Back to dashboard
      </Link>
    </div>
  );
}
