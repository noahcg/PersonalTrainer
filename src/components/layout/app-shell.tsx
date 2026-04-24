"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BookOpen,
  CalendarCheck,
  Dumbbell,
  Home,
  Library,
  LogOut,
  Megaphone,
  MessageCircle,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { createClient as createBrowserClient, hasSupabaseEnv } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NGLogoLockup } from "@/components/brand/ng-logo";

const trainerNav = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: Home },
  { href: "/trainer/bulletin", label: "Bulletin Board", icon: Megaphone },
  { href: "/trainer/clients", label: "Clients", icon: Users },
  { href: "/trainer/messages", label: "Communications", icon: MessageCircle },
  { href: "/trainer/plans", label: "Training Plans", icon: CalendarCheck },
  { href: "/trainer/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/trainer/exercises", label: "Exercise Library", icon: Library },
  { href: "/trainer/progress", label: "Progress", icon: TrendingUp },
  { href: "/trainer/resources", label: "Resources", icon: BookOpen },
  { href: "/trainer/settings", label: "Settings", icon: Settings },
];

const clientNav = [
  { href: "/client/home", label: "Home", icon: Home },
  { href: "/client/bulletin", label: "Bulletin", icon: Megaphone },
  { href: "/client/plan", label: "My Plan", icon: CalendarCheck },
  { href: "/client/workouts", label: "My Workouts", icon: Dumbbell },
  { href: "/client/progress", label: "Progress", icon: TrendingUp },
  { href: "/client/messages", label: "Messages", icon: MessageCircle },
  { href: "/client/profile", label: "Profile", icon: Users },
];

export function AppShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: Role;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "trainer" ? trainerNav : clientNav;

  async function handleLogout() {
    if (hasSupabaseEnv()) {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen px-3 py-3 text-charcoal-950 sm:px-5 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[238px_1fr]">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white/8 bg-charcoal-950 px-4 py-5 text-ivory-50 shadow-soft lg:flex">
          <Link href="/" className="block w-full rounded-[1.25rem]">
            <NGLogoLockup tone="light" subtext="Training" className="max-w-full" />
          </Link>
          <nav suppressHydrationWarning className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ivory-50/68 transition",
                    active ? "bg-white/10 text-white shadow-inner-soft" : "hover:bg-white/6 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-bronze-200" : "text-ivory-50/40 group-hover:text-bronze-200")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main suppressHydrationWarning className="min-w-0 pb-24 lg:pb-5">
          <header className="mb-5 rounded-[2rem] border border-white/70 bg-white/52 p-4 shadow-soft backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <motion.p
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[0.66rem] font-semibold uppercase tracking-[0.34em] text-bronze-600"
                >
                  {role === "trainer" ? brand.app.trainerHeaderLabel : brand.app.clientHeaderLabel}
                </motion.p>
                <motion.h1
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 }}
                  className="mt-2 font-serif text-4xl font-semibold tracking-tight text-charcoal-950 sm:text-5xl"
                >
                  {title}
                </motion.h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-stone-200/80 bg-white/72 p-2 shadow-inner-soft">
                <Avatar
                  name={role === "trainer" ? brand.app.trainerLabel : "Mara Lee"}
                  src={role === "trainer" ? undefined : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80"}
                />
                <div className="pr-3">
                  <p className="text-sm font-semibold">{role === "trainer" ? brand.app.trainerViewLabel : "Mara Lee"}</p>
                  <p className="text-xs text-stone-500">{role === "trainer" ? brand.tagline : brand.app.clientSupportLabel}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {children}
          </motion.div>
        </main>
      </div>

      <nav suppressHydrationWarning className="fixed inset-x-3 bottom-3 z-50 flex gap-1 overflow-x-auto rounded-full border border-white/70 bg-charcoal-950/92 p-2 shadow-soft backdrop-blur-xl lg:hidden">
        {nav.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-[10px] text-ivory-50/55",
                active && "bg-white/12 text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
