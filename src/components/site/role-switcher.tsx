"use client";

import { ChevronDown, GraduationCap, LogIn, LogOut, UserPlus, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { signOut, switchUser } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserView } from "@/lib/data/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { CANDIDATE: "Candidate", MENTOR: "Mentor" } as const;

function Avatar({ name, role, className }: { name: string; role: UserView["role"]; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-[0.65rem] font-semibold",
        role === "MENTOR" ? "bg-warn-soft text-warn" : "bg-signal-soft text-signal-ink",
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/**
 * The mocked auth surface: a real-looking account menu that is really a role
 * switcher over the seeded users. Switching keeps you on the current page.
 */
export function RoleSwitcher({ current, users }: { current: UserView | null; users: UserView[] }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();

  if (!current) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" className="rounded-full" aria-label="Account menu" />}
        >
          <UserRound className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem render={<Link href="/login" />} className="gap-2">
            <LogIn className="size-4" aria-hidden />
            Sign in
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/login?mode=signup" />} className="gap-2">
            <UserPlus className="size-4" aria-hidden />
            Sign up
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/mentor" />} className="gap-2">
            <GraduationCap className="size-4 text-signal" aria-hidden />
            Mentor portal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const groups: { role: UserView["role"]; label: string }[] = [
    { role: "CANDIDATE", label: "Candidates" },
    { role: "MENTOR", label: "Mentors" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 rounded-full px-1.5 sm:pr-2.5" aria-busy={pending} />}>
        <Avatar name={current.name} role={current.role} />
        {/* One line: the name, or the role when the account has no real name. */}
        <span className="hidden max-w-32 truncate text-[13px] font-medium lg:block">
          {current.name && current.name !== ROLE_LABEL[current.role] ? current.name : ROLE_LABEL[current.role]}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-start gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>Demo accounts: switching changes your role instantly. There are no passwords.</span>
        </div>
        <DropdownMenuSeparator />
        {groups.map(({ role, label }) => (
          <DropdownMenuGroup key={role}>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            {users
              .filter((u) => u.role === role)
              .map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  disabled={pending}
                  onClick={() => start(() => switchUser(u.id, pathname))}
                  className="gap-2"
                >
                  <Avatar name={u.name} role={u.role} className="size-6 text-[0.6rem]" />
                  <span className="flex-1 truncate">{u.name}</span>
                  {u.id === current.id && (
                    <Badge variant="secondary" className="text-[0.65rem]">
                      you
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/mentor" />} className="gap-2">
          <GraduationCap className="size-4 text-signal" aria-hidden />
          Mentor portal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => start(() => signOut())} className="gap-2">
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
