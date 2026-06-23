import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/perfil/:path*",
    "/api/profile/:path*",
    "/dashboard/:path*",
    "/api/dashboard/:path*",
  ],
};
