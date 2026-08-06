import { cn } from "@/lib/utils";

type Props = {
  /** Small caption under the wordmark, e.g. "Student portal". */
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  /** Use on dark/coloured backgrounds. */
  inverted?: boolean;
  className?: string;
};

const SIZES = {
  sm: { mark: "h-8 w-8 text-[13px]", word: "text-base", sub: "text-[9px]" },
  md: { mark: "h-10 w-10 text-[15px]", word: "text-xl", sub: "text-[10px]" },
  lg: { mark: "h-14 w-14 text-xl", word: "text-3xl sm:text-4xl", sub: "text-[11px]" },
} as const;

/**
 * CDAR text-only wordmark: a 3D monogram tile plus a letterspaced wordmark
 * and the institutional tri-colour rule.
 */
export function CdarLogo({ subtitle, size = "md", inverted = false, className }: Props) {
  const s = SIZES[size];

  return (
    <span className={cn("group/logo inline-flex min-w-0 items-center gap-3", className)}>
      <span
        aria-hidden
        className={cn(
          "logo-mark-3d grid shrink-0 place-items-center rounded-lg font-display font-extrabold tracking-tight",
          s.mark,
          inverted
            ? "bg-gold text-gold-foreground"
            : "bg-hero text-primary-foreground",
        )}
      >
        CD
      </span>
      <span className="grid min-w-0 leading-none">
        <span
          className={cn(
            "font-display font-extrabold tracking-[0.16em]",
            s.word,
            inverted ? "text-primary-foreground" : "text-foreground",
          )}
        >
          CDAR
        </span>
        <span className="rule-tricolor mt-1.5 block w-full max-w-[6.5rem] rounded-full" />
        {subtitle ? (
          <span
            className={cn(
              "mt-1.5 truncate font-semibold uppercase tracking-[0.22em]",
              s.sub,
              inverted ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
