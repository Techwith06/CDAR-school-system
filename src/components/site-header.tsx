import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Menu } from "lucide-react";
import { roleHome } from "@/lib/auth";
import { CdarLogo } from "@/components/cdar-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Home", hash: "top" },
  { to: "/", label: "Highlights", hash: "highlights" },
  { to: "/", label: "Blog", hash: "blog" },
  { to: "/", label: "Gallery", hash: "gallery" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <CdarLogo subtitle="Digital Academic Repository" size="sm" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to={roleHome[user.role]}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> My portal
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/student/login">Student sign in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/lecturer/login">Lecturer sign in</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-display">Navigate</SheetTitle>
              <nav className="mt-6 grid gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    hash={item.hash}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <Link to={roleHome[user.role]} className="rounded-md px-3 py-2 text-sm font-medium text-primary">
                    My portal
                  </Link>
                ) : (
                  <>
                    <Link to="/student/login" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      Student sign in
                    </Link>
                    <Link to="/lecturer/login" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      Lecturer sign in
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="rule-tricolor" />
    </header>
  );
}
