import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser, signupsOpen } from "@/lib/auth";

// Auth-aware: reads the session cookie, so the route blocks on the server.
export const instant = false;

export const metadata: Metadata = {
  title: "Create account — Deck Studio",
};

export default async function SignupPage() {
  const user = await requireUser();
  if (user) redirect("/decks");

  // Registrations closed (single-user mode): login is the only way in.
  if (!signupsOpen()) redirect("/login");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Your decks, written as code, presented in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthForm mode="signup" />
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
