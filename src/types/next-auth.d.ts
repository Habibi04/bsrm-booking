import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

// "next-auth/jwt" only re-exports `* from "@auth/core/jwt"` (a wildcard
// re-export), which TypeScript's declaration merging can't see through -
// augmenting it here would create a disconnected, unused JWT interface.
// The real interface lives in "@auth/core/jwt", so that's what must be
// augmented for `token.id`/`token.role` to type-check in src/auth.ts.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
