import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Initialize response object early
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for server-side operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request and response cookies
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request and response cookies
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // --- Session Refresh and User Retrieval ---
  // Refresh session to ensure it's valid and get user data
  const {
    data: { session },
    error: sessionError, // Capture potential errors during session refresh
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Middleware: Error refreshing session:",
      sessionError.message
    );
    // Decide how to handle session errors, maybe redirect to login?
    // For now, let's treat it as no session
  }

  const { pathname } = request.nextUrl;

  // --- Route Protection Logic ---

  // 1. Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      // Not logged in - Redirect to login
      console.log("Middleware: No session, redirecting to login for /admin");
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set(
        "error",
        "Acceso denegado a la zona de administración."
      );
      return NextResponse.redirect(redirectUrl);
    } else {
      // Logged in - Check if user is admin
      try {
        const { data: profile, error: profileError } = await supabase
          .from("public_user_profiles") // Use your actual profile table name
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error(
            "Middleware: Error fetching profile for admin check:",
            profileError.message
          );
          // Fail safely - deny access if profile check fails
          throw new Error("No se pudo verificar el perfil de administrador.");
        }

        if (!profile || !profile.is_admin) {
          // Not an admin - Redirect to home page (or an access denied page)
          console.warn(
            `Middleware: User ${session.user.email} (not admin) denied access to ${pathname}`
          );
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/"; // Redirect to home
          // Optionally add a message: redirectUrl.searchParams.set('message', 'Acceso denegado.');
          return NextResponse.redirect(redirectUrl);
        }

        // User is admin - Allow access
        console.log(
          `Middleware: Admin user ${session.user.email} granted access to ${pathname}`
        );
        // Continue to the requested admin page by returning the response object
        return response;
      } catch (e: unknown) {
        let errorMessage =
          "Error desconocido durante la verificación de administrador.";
        if (e instanceof Error) {
          errorMessage = e.message;
        } else if (typeof e === "string") {
          errorMessage = e;
        }
        console.error(
          "Middleware: Exception during admin check:",
          errorMessage
        );
        // Redirect to login on any unexpected error during the check
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set(
          "error",
          "Error al verificar permisos de administrador."
        );
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // 2. Protect /retos routes (and potentially others like /historial)
  // Add other protected routes here if needed
  if (pathname.startsWith("/retos") || pathname.startsWith("/historial")) {
    if (!session) {
      // Not logged in - Redirect to login
      console.log(
        `Middleware: No session, redirecting to login for ${pathname}`
      );
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set(
        "error",
        "Necesitas iniciar sesión para acceder a esta página."
      );
      return NextResponse.redirect(redirectUrl);
    }
    // Logged in - Allow access
    // Continue to the requested page
    return response;
  }

  // --- Default: Allow Access ---
  // For public routes or routes already handled, return the response
  return response;
}

// --- Matcher Configuration ---
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, workers, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)",
    // Explicitly include protected paths if needed, though the above pattern usually covers them
    // '/admin/:path*',
    // '/retos/:path*',
    // '/historial/:path*',
  ],
};
