import Link from "next/link";
import { BadgeDollarSign, LogIn, UserRound } from "lucide-react";
import { NGLogoLockup } from "@/components/brand/ng-logo";
import { brand } from "@/lib/brand";
import { appVersion } from "@/lib/version";
import { Button } from "@/components/ui/button";

export function PublicSiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-4 pb-24 sm:px-6 sm:pb-4">
      <a href="#main-content" className="skip-link">
        Skip to main
      </a>
      <div className="mx-auto max-w-7xl">
        <header className="py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="block w-fit min-w-0 shrink-0">
              <NGLogoLockup tone="ink" subtext="Training" monogramVariant="mark" />
            </Link>
            <nav
              aria-label="Public navigation"
              className="hidden items-center justify-end gap-3 sm:flex"
            >
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-charcoal-950"
                href="/about"
              >
                Meet the Trainer
              </Link>
              <Button asChild variant="ghost" className="h-10 px-4">
                <Link href="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="warm" className="h-10 px-4">
                <Link href="/login">Client login</Link>
              </Button>
            </nav>
          </div>
        </header>
        <main id="main-content" className="scroll-mt-4">{children}</main>
        <footer className="border-t border-stone-200/70 px-5 py-6 text-sm text-stone-500 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{brand.businessName}</p>
            <span className="text-stone-400">v{appVersion}</span>
          </div>
        </footer>
      </div>
      <nav
        aria-label="Public mobile navigation"
        className="fixed inset-x-4 bottom-3 z-50 grid grid-cols-3 gap-1 rounded-full border border-white/70 bg-ivory-50/94 p-2 shadow-soft backdrop-blur-xl sm:hidden"
      >
        {[
          { href: "/about", label: "Trainer", icon: UserRound },
          { href: "/pricing", label: "Pricing", icon: BadgeDollarSign },
          { href: "/login", label: "Client login", icon: LogIn, featured: true },
        ].map(({ href, label, icon: Icon, featured }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-full px-3 text-center text-[11px] font-medium transition ${
              featured
                ? "bg-bronze-500 text-white shadow-warm"
                : "text-stone-600 hover:bg-stone-100 hover:text-charcoal-950"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
