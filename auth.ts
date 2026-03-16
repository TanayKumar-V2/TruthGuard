import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  trustHost: true,
  debug: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicRoutes = ["/", "/login"];
      const internalRoutes = ["/dashboard", "/threats", "/fact-check", "/community"];
      
      const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
      const isInternalRoute = internalRoutes.some(route => nextUrl.pathname.startsWith(route));

      if (isInternalRoute && !isLoggedIn) {
        return false; // Redirect to login
      }

      if (nextUrl.pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
});
