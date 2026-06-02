"use client";

import { useEffect, useState } from "react";
import { Flame, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  // Surface auth errors passed back from the callback (?error=…).
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) {
      toast.error(
        error === "auth"
          ? "Sign-in failed or the link expired. Please try again."
          : "Something went wrong signing you in.",
      );
    }
  }, []);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google.
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLinkLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLinkLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a magic sign-in link.");
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Flame className="size-6" />
          </div>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Your personal dashboard</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {!configured && (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Supabase isn&apos;t configured yet. Copy{" "}
              <code className="font-mono">.env.local.example</code> to{" "}
              <code className="font-mono">.env.local</code>, fill in your project
              URL, key, and <code className="font-mono">ALLOWED_EMAILS</code>, then
              restart the dev server.
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!configured || googleLoading}
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="size-4" />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!configured || linkLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!configured || linkLoading}
            >
              <Mail className="size-4" />
              {linkLoading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
