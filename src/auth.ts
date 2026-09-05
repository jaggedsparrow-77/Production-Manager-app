import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { devLoginEnabled, env, githubEnabled } from "@/env";

const providers = [];

if (githubEnabled) {
  providers.push(
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (devLoginEnabled) {
  /**
   * Development-only sign-in: enter a seeded user's email, get a session.
   *
   * There is no password check, so this must never reach a deployed
   * environment. Two guards stand in the way — `devLoginEnabled` is false
   * unless NODE_ENV is non-production, and src/env.ts refuses to boot at all
   * if ALLOW_DEV_LOGIN is set in production.
   */
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Development sign-in",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        if (!email) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        return user ? { id: user.id, name: user.name, email: user.email, image: user.image } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // The Credentials provider cannot use database sessions, so the whole app
  // uses JWT sessions for consistency between local and deployed behaviour.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
