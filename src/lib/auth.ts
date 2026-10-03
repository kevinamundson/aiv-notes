import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

function writerAllowlist(): Set<string> {
  const raw = process.env.WRITER_ALLOWLIST ?? "kevinamundson";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowlistedLogin(login: string | null | undefined): boolean {
  if (!login) return false;
  return writerAllowlist().has(login.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const login =
        (profile as { login?: string } | undefined)?.login ??
        profile?.name ??
        null;
      // Only allowlisted writers may establish a session for write ops.
      // Read of chapters remains public without sign-in.
      if (!isAllowlistedLogin(typeof login === "string" ? login : null)) {
        return false;
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile && (profile as { login?: string }).login) {
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { login?: string }).login =
          typeof token.login === "string" ? token.login : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/api/auth/signin",
    error: "/api/auth/error",
  },
  trustHost: true,
});

export async function requireWriterSession() {
  const session = await auth();
  const login = (session?.user as { login?: string } | undefined)?.login;
  if (!session?.user || !isAllowlistedLogin(login)) {
    return null;
  }
  return session;
}
