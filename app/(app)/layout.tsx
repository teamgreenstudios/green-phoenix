import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard-header";

/**
 * Authenticated app chrome: guards the session and renders the shared header.
 * Pages under (app) render inside the <main> container.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this; redirect defensively if reached without a user.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
