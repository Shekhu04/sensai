import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"; // Import Clerk middleware and helper
import { NextResponse } from "next/server";

// Define a matcher function for all routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", // Matches /dashboard and all subpaths like /dashboard/settings
  "/resume(.*)", // Matches /resume and subpaths
  "/interview(.*)", // Matches /interview and subpaths
  "/ai-cover-letter(.*)", // Matches /ai-cover-letter and subpaths
  "/onboarding(.*)", // Matches /onboarding and subpaths
]);

// Create and export Clerk middleware
export default clerkMiddleware(async (auth, req) => {
  // Destructure userId from the Clerk `auth` function
  const { userId } = await auth();

  // If user is not authenticated AND is trying to access a protected route
  if (!userId && isProtectedRoute(req)) {
    // Get redirect function to sign in from Clerk
    const { redirectToSignIn } = await auth();

    // Redirect the user to the sign-in page
    return redirectToSignIn();
  }

  // If the user is authenticated OR the route is public, continue as normal
  return NextResponse.next();
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
