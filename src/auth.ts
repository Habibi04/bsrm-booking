import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The credentials provider checks a password against a hash on every
  // request - it has no persistent session record to look up, so it can't
  // use Auth.js's database-session strategy. JWT sessions are mandatory here.
  session: { strategy: "jwt" },

  // Auth.js's default sign-in page doesn't exist for us - we're building our
  // own /login route (a later step), and this tells Auth.js to redirect
  // unauthenticated visitors there instead of its built-in page.
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Same failure path for "no such user" and "deactivated user" - the
        // login form must not be able to tell an attacker which is true.
        if (!user || !user.isActive) return null;

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Runs whenever a JWT is created or read. `user` is only present on the
    // sign-in request itself (authorize() just returned it above) - this is
    // the one chance to copy fields from the database user onto the token
    // that gets encoded into the session cookie.
    async jwt({ token, user }) {
      // Auth.js's base User type marks `id` optional (a plain OAuth profile
      // isn't guaranteed to have one yet), even though our own authorize()
      // above always returns a real one. Narrowing on `user?.id` satisfies
      // that without an `as` cast.
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Runs whenever session data is read (e.g. by `auth()` in a page or
    // route handler). Copies the fields we stashed on the token onto the
    // session object your app code actually reads.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
