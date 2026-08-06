import { Link } from "@tanstack/react-router";
import { CdarLogo } from "@/components/cdar-logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <CdarLogo subtitle="Digital Academic Repository" size="sm" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Centralized Digital Academic Repository — one structured home for lecture notes,
            past questions, assignments, manuals and research across every department.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Adwen, Akoma na Nsa ma Mpuntu
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Explore</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/" hash="highlights" className="hover:text-foreground">Highlights</Link></li>
            <li><Link to="/" hash="blog" className="hover:text-foreground">Blog</Link></li>
            <li><Link to="/" hash="gallery" className="hover:text-foreground">Gallery</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Account</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/student/login" className="hover:text-foreground">Student sign in</Link></li>
            <li><Link to="/lecturer/login" className="hover:text-foreground">Lecturer sign in</Link></li>
            <li><Link to="/admin/login" className="hover:text-foreground">Administrator sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        CDAR v1.0 — UI prototype. No live backend attached.
      </div>
    </footer>
  );
}
