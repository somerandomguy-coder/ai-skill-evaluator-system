import Image from "next/image";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The official mark, rebuilt as a vector from the brand artwork (public/brand). */
export const LOGO_MARK_SRC = "/brand/codecraft-mark.svg";

type Tone = "auto" | "onLight" | "onDark";

const WORDMARK_TONE: Record<Tone, string> = {
  // Follows the theme: ink on Light Porcelain, near-white on Dark Space.
  auto: "text-foreground dark:text-white",
  // Fixed tones for surfaces that don't follow the theme (e.g. a dark banner in light mode).
  onLight: "text-[#090D16]",
  onDark: "text-[#F8FAFC]",
};

export interface LogoProps {
  /** Mark size in px (square). Overridden by `width` / `height`. */
  size?: number;
  width?: number;
  height?: number;
  /** Show the "codecraft" wordmark beside the mark. */
  showWordmark?: boolean;
  tone?: Tone;
  priority?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}

/**
 * The codecraft logo: the orange mark plus a typeset wordmark. The mark is the
 * brand orange on a transparent ground, so it reads on both light and dark
 * surfaces; the wordmark takes its colour from `tone`.
 */
export function Logo({
  size = 28,
  width,
  height,
  showWordmark = true,
  tone = "auto",
  priority = false,
  className,
  markClassName,
  wordmarkClassName,
}: LogoProps) {
  const w = width ?? size;
  const h = height ?? size;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={LOGO_MARK_SRC}
        alt={`${APP_NAME} logo`}
        width={w}
        height={h}
        priority={priority}
        unoptimized
        draggable={false}
        className={cn("shrink-0 select-none", markClassName)}
        style={{ width: w, height: h }}
      />
      {showWordmark && (
        // The image's alt already names the brand, so the text is hidden from screen readers.
        <span aria-hidden className={cn("relative leading-none font-bold tracking-tight", WORDMARK_TONE[tone], wordmarkClassName)} style={{ fontSize: Math.round(h * 0.68) }}>
          {APP_NAME}
          {/* The orange tick after the "t", as in the official wordmark. */}
          <span className="absolute top-[0.2em] -right-[0.3em] h-[0.12em] w-[0.2em] rounded-full bg-brand" />
        </span>
      )}
    </span>
  );
}
