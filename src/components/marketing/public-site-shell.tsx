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
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/45 shadow-soft backdrop-blur-xl">
        <header className="border-b border-stone-200/70 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="block w-fit">
              <NGLogoLockup tone="ink" subtext="Training" monogramVariant="mark" />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-charcoal-950"
                href="/about"
              >
                Meet the Trainer
              </Link>
              <Button asChild variant="ghost">
                <Link href="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="warm">
                <Link href="/login">Client login</Link>
              </Button>
            </div>
          </div>
        </header>
        <main>{children}</main>
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
