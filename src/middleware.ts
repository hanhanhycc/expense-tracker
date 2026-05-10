export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Bảo vệ tất cả route trừ static, api/auth, login, register, manifest, sw
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*\\.js|icons|login|register).*)",
  ],
};
