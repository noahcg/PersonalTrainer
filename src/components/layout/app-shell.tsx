"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BookOpen,
  CalendarCheck,
  Dumbbell,
  Home,
  Library,
  Megaphone,
  MessageCircle,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";

const trainerNav = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: Home },
  { href: "/trainer/bulletin", label: "Bulletin Board", icon: Megaphone },
  { href: "/trainer/clients", label: "Clients", icon: Users },
  { href: "/trainer/plans", label: "Training Plans", icon: CalendarCheck },
  { href: "/trainer/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/trainer/exercises", label: "Exercise Library", icon: Library },
  { href: "/trainer/check-ins", label: "Check-ins", icon: MessageCircle },
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
  const nav = role === "trainer" ? trainerNav : clientNav;

  return (
    <div className="min-h-screen px-3 py-3 text-charcoal-950 sm:px-5 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] rounded-[2.25rem] border border-white/70 bg-charcoal-950/92 p-4 text-ivory-50 shadow-soft backdrop-blur-xl lg:block">
          <Link href="/" className="flex items-center gap-3 rounded-[1.5rem] px-3 py-4">
            <div className="grid size-11 place-items-center rounded-2xl bg-bronze-500 shadow-warm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold leading-none">Aurelian</p>
              <p className="text-xs text-ivory-50/55">Coach studio</p>
            </div>
          </Link>
          <nav suppressHydrationWarning className="mt-6 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ivory-50/68 transition",
                    active ? "bg-white/12 text-white shadow-inner-soft" : "hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-bronze-200" : "text-ivory-50/40 group-hover:text-bronze-200")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="absolute inset-x-4 bottom-4 rounded-[1.7rem] border border-white/10 bg-white/8 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-bronze-200">Today</p>
            <p className="mt-2 text-sm leading-6 text-ivory-50/75">
              {role === "trainer" ? "3 clients need review. 8 workouts scheduled." : "Lower Strength A is ready when you are."}
            </p>
          </div>
        </aside>

        <main suppressHydrationWarning className="min-w-0 pb-24 lg:pb-5">
          <header className="mb-5 rounded-[2.25rem] border border-white/70 bg-white/60 p-4 shadow-soft backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <motion.p
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600"
                >
                  {role === "trainer" ? "Trainer command center" : "Client coaching space"}
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
              <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white/70 p-2 shadow-inner-soft">
                <Avatar
                  name={role === "trainer" ? "Avery Stone" : "Mara Lee"}
                  src={role === "trainer" ? undefined : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80"}
                />
                <div className="pr-3">
                  <p className="text-sm font-semibold">{role === "trainer" ? "Avery Stone" : "Mara Lee"}</p>
                  <p className="text-xs text-stone-500">{role === "trainer" ? "Head trainer" : "Strong & Calm 12"}</p>
                </div>
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
