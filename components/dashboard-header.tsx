import Link from "next/link";
import { Flame } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/auth/account-menu";
import { MainNav } from "@/components/main-nav";
import { CommandPalette } from "@/components/command-palette";
import { AccentPicker } from "@/components/accent-picker";

/**
 * Top bar: app title, primary nav, theme toggle, account menu (sign out).
 * The edit-mode toggle is added with the tile system in a later milestone.
 */
export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Flame className="size-5 text-primary" />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              Dashboard
            </span>
          </Link>
          <MainNav />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CommandPalette />
          <AccentPicker />
          <ThemeToggle />
          <AccountMenu email={email} />
        </div>
      </div>
    </header>
  );
}
