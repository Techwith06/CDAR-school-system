import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CdarLogo } from "@/components/cdar-logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/cdar-data";

type Props = {
  role: Role;
  eyebrow: string;
  heading: string;
  blurb: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  notice: ReactNode;
  /** Tailwind classes for the decorative side panel. */
  panelClass: string;
  /** Imported image shown on the decorative panel and mobile banner. */
  image: string;
  imageAlt: string;
};

export function RoleLoginForm({
  role,
  eyebrow,
  heading,
  blurb,
  identifierLabel,
  identifierPlaceholder,
  notice,
  panelClass,
  image,
  imageAlt,
}: Props) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className={`relative hidden flex-col justify-between overflow-hidden p-8 xl:p-12 lg:flex ${panelClass}`}
      >
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div
          aria-hidden
          className="pulse-glow absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-gold/30 blur-3xl"
        />
        <div className="relative">
          <CdarLogo subtitle={eyebrow} inverted />
        </div>
        <div className="relative reveal-up">
          <h2 className="text-3d max-w-sm font-display text-3xl font-extrabold leading-tight xl:text-4xl">
            {heading}
          </h2>
          <p className="mt-5 max-w-sm text-sm opacity-90">{blurb}</p>
        </div>
        <div className="rule-tricolor relative w-40 rounded-full" />
      </div>

      <div className="flex flex-col">
        {/* Mobile / tablet banner keeps the portal imagery on small screens. */}
        <div className="relative h-36 overflow-hidden sm:h-44 lg:hidden">
          <img src={image} alt={imageAlt} className="h-full w-full object-cover" />
          <div className={`absolute inset-0 opacity-80 ${panelClass}`} />
          <div className="absolute inset-0 flex items-end p-4">
            <CdarLogo subtitle={eyebrow} size="sm" inverted />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting) return;
              setSubmitting(true);
              try {
                const user = await signIn(role, { identifier, password });
                toast.success("Signed in", {
                  description: `Welcome back, ${user.full_name}. Opening the ${role} portal.`,
                });
                navigate({ to: roleHome[role] });
              } catch (err) {
                toast.error("Sign in failed", {
                  description:
                    err instanceof Error ? err.message : "Check your credentials and try again.",
                });
              } finally {
                setSubmitting(false);
              }
            }}
            className="reveal-up w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-panel sm:p-8"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="identifier">{identifierLabel}</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={identifierPlaceholder}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="remember" defaultChecked /> Keep me signed in
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Contact the repository administrator for a reset.")}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" size="lg" className="mt-2" disabled={submitting}>
                <LogIn className="mr-2 h-4 w-4" />
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </div>

            <div className="mt-6 flex gap-3 rounded-lg border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>{notice}</p>
            </div>

            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to the public site
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
