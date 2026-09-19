import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { data } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { RoleSwitcher } from "./role-switcher";

export async function SiteHeader() {
  const [user, users] = await Promise.all([getCurrentUser(), data.listUsers()]);

  const items: NavItem[] =
    user?.role === "MENTOR"
      ? [{ href: "/mentor", label: "Review queue", match: ["/mentor"] }]
      : [{ href: "/", label: "New challenge", match: ["/", "/challenge"] }];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
          <span>{APP_NAME}</span>
        </Link>
        {user && <NavLinks items={items} />}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {isDemoMode() && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800" title="No live AI or search calls. Cached responses only.">
              Demo mode
            </Badge>
          )}
          <RoleSwitcher current={user} users={users} />
        </div>
      </div>
    </header>
  );
}
