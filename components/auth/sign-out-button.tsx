"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "outline",
  withIcon = false,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  withIcon?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={signOut} disabled={loading}>
      {withIcon && <LogOut className="size-4" />}
      Sign out
    </Button>
  );
}
