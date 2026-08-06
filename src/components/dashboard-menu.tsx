import { Link } from "@tanstack/react-router";
import { Home, LogOut, Menu, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CdarLogo } from "@/components/cdar-logo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DashboardMenuLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
};

export type DashboardMenuGroup = {
  label?: string;
  links: DashboardMenuLink[];
};

type DashboardMenuProps = {
  brand: string;
  groups: DashboardMenuGroup[];
  user: { name: string; subtitle?: string };
  signOut: () => void;
  publicHref?: string;
  variant?: "hero" | "default";
  activeClassName?: string;
  className?: string;
};

export function DashboardMenu({
  brand,
  groups,
  user,
  signOut,
  publicHref = "/",
  variant = "default",
  activeClassName = "data-[status=active]:bg-gold data-[status=active]:text-gold-foreground",
  className,
}: DashboardMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Open navigation menu"
          className={cn(
            variant === "hero"
              ? "border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto p-0">
        <SheetTitle className="sr-only">{brand} navigation menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigation links for the {brand}. Close and sign out actions are at the bottom.
        </SheetDescription>

        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 pb-4 pt-12">
            <CdarLogo subtitle={brand} size="sm" />
          </div>

          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold">{user.name}</p>
            {user.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{user.subtitle}</p>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {groups.map((g, gi) => (
              <div key={gi} className="grid gap-1">
                {g.label && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {g.label}
                  </p>
                )}
                {g.links.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link
                      to={l.to as never}
                      {...(l.exact === undefined ? {} : { activeOptions: { exact: l.exact } })}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                        "data-[status=active]:bg-gold data-[status=active]:text-gold-foreground",
                        activeClassName,
                      )}
                    >
                      <l.icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{l.label}</span>
                      {typeof l.badge === "number" && l.badge > 0 && (
                        <span className="rounded-full bg-crimson px-1.5 py-0.5 text-[10px] font-bold text-crimson-foreground">
                          {l.badge}
                        </span>
                      )}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            ))}
          </nav>

          <div className="grid gap-2 border-t border-border p-4">
            <Link
              to={publicHref}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Home className="h-4 w-4" /> Public site
            </Link>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
