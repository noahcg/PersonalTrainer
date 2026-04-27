import Link from "next/link";
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
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <a href="#main-content" className="skip-link">
        Skip to main
      </a>
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/45 shadow-soft backdrop-blur-xl sm:rounded-[2.75rem]">
        <header className="border-b border-stone-200/70 px-4 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="block w-fit shrink-0">
              <NGLogoLockup tone="ink" subtext="Training" monogramVariant="mark" />
            </Link>
            <div className="no-scrollbar -mx-1 flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 sm:gap-3 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
              <Link
                className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-charcoal-950"
                href="/about"
              >
                Meet the Trainer
              </Link>
              <Button asChild variant="ghost" className="shrink-0">
                <Link href="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="warm" className="shrink-0">
                <Link href="/login">Client login</Link>
              </Button>
            </div>
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
    </div>
  );
}
