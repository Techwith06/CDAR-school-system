import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import heroImage from "@/assets/hero-library.jpg";
import blogStudy from "@/assets/blog-study.jpg";
import blogExams from "@/assets/blog-exams.jpg";
import blogLab from "@/assets/blog-lab.jpg";
import adBanner from "@/assets/ad-banner.jpg";
import { CdarLogo } from "@/components/cdar-logo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADS, BLOG_POSTS, relativeDate } from "@/lib/cdar-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CDAR — Centralized Digital Academic Repository" },
      {
        name: "description",
        content:
          "News, campus notices and stories from the Centralized Digital Academic Repository. Sign in to browse, upload and download academic materials.",
      },
      { property: "og:title", content: "CDAR — Centralized Digital Academic Repository" },
      {
        property: "og:description",
        content:
          "Campus stories, notices and highlights from CDAR. All repository activity happens inside your dashboard.",
      },
    ],
  }),
  component: Home,
});

const GALLERY = [
  { src: blogStudy, alt: "Students revising together with notes and laptops", label: "Study groups" },
  { src: blogLab, alt: "Student configuring routers in the networking lab", label: "Practical labs" },
  { src: blogExams, alt: "Stack of past examination question papers on a desk", label: "Past questions" },
  { src: heroImage, alt: "University library reading hall", label: "Reading halls" },
];

const BLOG_IMAGES = [blogStudy, blogLab, blogExams];

const TONE: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  gold: "bg-gold text-gold-foreground",
  crimson: "bg-crimson text-crimson-foreground",
};

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section id="top" className="relative overflow-hidden bg-hero text-primary-foreground">
          <img
            src={heroImage}
            alt="Students studying in a university library"
            width={1600}
            height={1104}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div
            aria-hidden
            className="pulse-glow absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pulse-glow absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-crimson/20 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div className="reveal-up min-w-0">
              <CdarLogo subtitle="Digital Academic Repository" size="lg" inverted />
              <Badge className="mt-6 bg-gold text-gold-foreground hover:bg-gold">Version 1.0</Badge>
              <h1 className="text-3d mt-4 text-3xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
                Campus stories, notices
                <span className="block text-accent">and everything new at CDAR.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:mt-6 sm:text-lg">
                This is the public front page — read the blog, browse the gallery and check
                campus notices. Searching, uploading and downloading materials all happen
                inside your dashboard once you sign in.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                  <Link to="/student/login">
                    Student sign in <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/lecturer/login">Lecturer sign in</Link>
                </Button>
              </div>
            </div>

            <div className="float-soft grid gap-3">
              {[
                { to: "/student/login" as const, title: "Student portal", body: "cdar.edu/student/login — find and download material for your level." },
                { to: "/lecturer/login" as const, title: "Lecturer portal", body: "cdar.edu/lecturer/login — publish notes, past questions and manuals." },
                { to: "/admin/login" as const, title: "Administrator console", body: "cdar.edu/admin/login — register accounts and moderate the catalog." },
              ].map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="card-3d rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 p-4 transition-colors hover:bg-primary-foreground/20 sm:p-5"
                >
                  <p className="font-display text-base font-extrabold sm:text-lg">{c.title}</p>
                  <p className="mt-1 break-words text-sm text-primary-foreground/85">{c.body}</p>
                </Link>
              ))}
            </div>

          </div>
        </section>


        {/* Ads / notices */}
        <section id="highlights" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={adBanner}
              alt="Decorative blue and gold promotional banner"
              width={1600}
              height={600}
              loading="lazy"
              className="h-44 w-full object-cover sm:h-56"
            />
            <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-primary/55 px-4 sm:px-6 text-primary-foreground sm:px-10">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Featured notice</span>
              <h2 className="max-w-xl text-xl font-extrabold sm:text-3xl">
                Semester 1 material drop is live in the repository
              </h2>
              <p className="max-w-lg text-sm text-primary-foreground/90">
                Sign in to your dashboard to browse the newest lecture notes, manuals and
                past-question bundles.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ADS.map((ad) => (
              <article key={ad.id} className="card-3d flex flex-col rounded-xl border border-border bg-card p-5 shadow-panel sm:p-6">
                <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${TONE[ad.tone]}`}>
                  {ad.eyebrow}
                </span>
                <h3 className="mt-4 text-lg font-bold">{ad.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{ad.body}</p>
                <Button variant="outline" size="sm" className="mt-5 w-fit">
                  {ad.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery" className="border-y border-border bg-secondary/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-2xl font-bold sm:text-3xl">Around campus</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Reading halls, practical labs and study groups — the places where CDAR
              materials get used.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {GALLERY.map((img) => (
                <figure key={img.label} className="card-3d group overflow-hidden rounded-xl border border-border bg-card">
                  <img
                    src={img.src}
                    alt={img.alt}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="h-32 w-full object-cover transition-transform sm:h-44 duration-300 group-hover:scale-105"
                  />
                  <figcaption className="px-4 py-3 text-sm font-semibold">{img.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Blog */}
        <section id="blog" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">From the CDAR blog</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Study guidance, campus notes and department updates.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post, i) => (
              <article key={post.id} className="card-3d flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-panel">
                <img
                  src={BLOG_IMAGES[i % BLOG_IMAGES.length]}
                  alt=""
                  aria-hidden
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-6">
                  <Badge variant="secondary" className="w-fit">{post.category}</Badge>
                  <h3 className="mt-3 text-lg font-bold leading-snug">{post.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {relativeDate(post.published_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {post.read_minutes} min read
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium">{post.author}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to open the repository?</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Search, filter, upload and download from your personal dashboard.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/student/login">
                Student sign in <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
