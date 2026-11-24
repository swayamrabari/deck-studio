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
  title: "Sign in — Deck Studio",
};

export default async function LoginPage() {
  const user = await requireUser();
  if (user) redirect("/decks");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Back to your decks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthForm mode="login" />
          {signupsOpen() ? (
            <p className="text-center text-xs text-muted-foreground">
              New here?{" "}
              <Link
                href="/signup"
                className="text-foreground underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
