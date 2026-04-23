import Link from "next/link";
import { NGLogoLockup } from "@/components/brand/ng-logo";
import { Button } from "@/components/ui/button";

export function PublicSiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/45 shadow-soft backdrop-blur-xl">
        <header className="border-b border-stone-200/70 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="block w-fit">
              <NGLogoLockup tone="ink" subtext="Coaching" />
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
                <Link className="rounded-full px-4 py-2 transition hover:bg-stone-100 hover:text-charcoal-950" href="/">
                  Home
                </Link>
                <Link className="rounded-full px-4 py-2 transition hover:bg-stone-100 hover:text-charcoal-950" href="/about">
                  About
                </Link>
                <Link className="rounded-full px-4 py-2 transition hover:bg-stone-100 hover:text-charcoal-950" href="/pricing">
                  Pricing
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost">
                  <Link href="/login">Client login</Link>
                </Button>
                <Button asChild variant="warm">
                  <Link href="/pricing">Start here</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-stone-200/70 px-5 py-6 text-sm text-stone-500 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Nick Glushien Coaching</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link className="transition hover:text-charcoal-950" href="/about">
                Meet the coach
              </Link>
              <Link className="transition hover:text-charcoal-950" href="/pricing">
                Pricing
              </Link>
              <Link className="transition hover:text-charcoal-950" href="/login">
                Existing client login
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
