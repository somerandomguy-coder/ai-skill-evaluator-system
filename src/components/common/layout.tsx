import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { cn } from "@/lib/utils";

/** Standard page frame: centred column, header spacing and the footer. */
export function PageShell({ children, className, width = "6xl" }: { children: ReactNode; className?: string; width?: "4xl" | "5xl" | "6xl" | "7xl" }) {
  const max = { "4xl": "max-w-4xl", "5xl": "max-w-5xl", "6xl": "max-w-6xl", "7xl": "max-w-7xl" }[width];
  return (
    <>
      <div className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8", max, className)}>{children}</div>
      <SiteFooter />
    </>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {eyebrow && <div className="text-[13px] font-medium text-muted-foreground">{eyebrow}</div>}
      <h2 className="font-title text-xl text-balance sm:text-2xl">{title}</h2>
      {description && <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>}
    </div>
  );
}
