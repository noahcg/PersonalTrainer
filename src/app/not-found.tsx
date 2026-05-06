import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main suppressHydrationWarning className="grid min-h-screen place-items-center px-5">
      <Card className="max-w-lg p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Not found</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">This coaching space is unavailable.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">The page may have moved or the record is no longer active.</p>
        <Button asChild className="mt-6" variant="warm"><Link href="/">Return home</Link></Button>
      </Card>
    </main>
  );
}
