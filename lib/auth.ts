import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Login hanya aktif kalau kredensial OAuth diisi. Tanpa itu, aplikasi tetap jalan di mode tamu. */
export const authEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET,
);

export async function refreshGoogleToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) return { ...token, error: "RefreshTokenMissing" };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const json = await res.json();
    if (!res.ok) return { ...token, error: "RefreshFailed" };
    return {
      ...token,
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
      refreshToken: json.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: authEnabled
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: {
              scope: `openid email profile ${DRIVE_FILE_SCOPE}`,
              access_type: "offline",
              prompt: "consent",
              include_granted_scopes: "true",
            },
          },
        }),
      ]
    : [],
  session: { strategy: "jwt", maxAge: 30 * 86_400 },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000,
          driveGranted: (account.scope ?? "").includes(DRIVE_FILE_SCOPE),
        };
      }
      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) return token;
      return refreshGoogleToken(token);
    },
    // Token Google tidak pernah dikirim ke browser. Klien hanya tahu id, nama, email, dan status izin.
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      session.driveGranted = Boolean(token.driveGranted);
      session.error = token.error;
      return session;
    },
  },
};
