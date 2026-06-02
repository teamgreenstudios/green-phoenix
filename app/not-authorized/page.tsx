import { ShieldX } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotAuthorizedPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldX className="size-6" />
          </div>
          <CardTitle className="text-xl">Not authorized</CardTitle>
          <CardDescription>
            This account isn&apos;t on the allowlist for this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignOutButton withIcon />
        </CardContent>
      </Card>
    </div>
  );
}
