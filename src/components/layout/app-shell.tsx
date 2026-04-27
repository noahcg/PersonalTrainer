"use client";

import { useEffect, useEffectEvent, useState } from "react";
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
import { clients as demoClients } from "@/lib/demo-data";
import { demoClientsStorageKey } from "@/lib/demo-client-storage";
import { profileUpdatedEventName, readDemoTrainerSettings } from "@/lib/profile-identity";
import { createClient as createBrowserClient, hasSupabaseEnv } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { appVersion } from "@/lib/version";
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
  { href: "/client/resources", label: "Resources", icon: BookOpen },
  { href: "/client/messages", label: "Messages", icon: MessageCircle },
  { href: "/client/profile", label: "Profile", icon: Users },
];

export function AppShell({
  role,
  title,
  subtitle,
  dynamicGreetingName,
  children,
}: {
  role: Role;
  title: string;
  subtitle: string;
  dynamicGreetingName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "trainer" ? trainerNav : clientNav;
  const homeHref = role === "trainer" ? "/trainer/dashboard" : "/client/home";
  const [greetingHour, setGreetingHour] = useState<number | null>(null);
  const [identity, setIdentity] = useState({
    name: role === "trainer" ? brand.app.trainerViewLabel : "Mara Lee",
    photo: role === "trainer" ? "" : demoClients[0]?.photo ?? "",
    subtitle: role === "trainer" ? brand.tagline : brand.app.clientSupportLabel,
  });

  function getTimeBasedGreeting(name: string, hour = new Date().getHours()) {
    if (hour >= 5 && hour < 12) {
      return `Good morning, ${name}.`;
    }

    if (hour >= 12 && hour < 17) {
      return `Still rolling, ${name}.`;
    }

    if (hour >= 17 && hour < 21) {
      return `Finish strong, ${name}.`;
    }

    return `Still going, ${name}.`;
  }

  async function loadIdentity() {
    if (!hasSupabaseEnv()) {
      if (role === "trainer") {
        const trainerSettings = readDemoTrainerSettings();
        setIdentity({
          name: trainerSettings.name || brand.app.trainerViewLabel,
          photo: trainerSettings.photo,
          subtitle: brand.tagline,
        });
        return;
      }

      const stored = window.localStorage.getItem(demoClientsStorageKey);
      if (stored) {
        try {
          const clients = JSON.parse(stored) as Array<{ name: string; photo?: string }>;
          const client = clients[0];
          if (client) {
            setIdentity({
              name: client.name,
              photo: client.photo ?? "",
              subtitle: brand.app.clientSupportLabel,
            });
            return;
          }
        } catch {
          window.localStorage.removeItem(demoClientsStorageKey);
        }
      }

      setIdentity({
        name: demoClients[0]?.name ?? "Client",
        photo: demoClients[0]?.photo ?? "",
        subtitle: brand.app.clientSupportLabel,
      });
      return;
    }

    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (role === "trainer") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<{ full_name: string; avatar_url: string | null }>();

      setIdentity({
        name: profile?.full_name ?? brand.app.trainerViewLabel,
        photo: profile?.avatar_url ?? "",
        subtitle: brand.tagline,
      });
      return;
    }

    const { data: client } = await supabase
      .from("clients")
      .select("full_name, profile_photo_url")
      .eq("profile_id", user.id)
      .maybeSingle<{ full_name: string; profile_photo_url: string | null }>();

    setIdentity({
      name: client?.full_name ?? "Client",
      photo: client?.profile_photo_url ?? "",
      subtitle: brand.app.clientSupportLabel,
    });
  }

  const syncIdentity = useEffectEvent(() => {
    void loadIdentity();
  });
  const syncGreetingHour = useEffectEvent(() => {
    setGreetingHour(new Date().getHours());
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      syncIdentity();
    }, 0);

    window.addEventListener(profileUpdatedEventName, syncIdentity);
    window.addEventListener("storage", syncIdentity);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener(profileUpdatedEventName, syncIdentity);
      window.removeEventListener("storage", syncIdentity);
    };
  }, [role]);

  useEffect(() => {
    if (!dynamicGreetingName) {
      return;
    }

    const timeout = window.setTimeout(() => {
      syncGreetingHour();
    }, 0);
    const interval = window.setInterval(() => {
      syncGreetingHour();
    }, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [dynamicGreetingName]);

  const displayTitle =
    dynamicGreetingName && greetingHour !== null ? getTimeBasedGreeting(dynamicGreetingName, greetingHour) : title;

  async function handleLogout() {
    if (hasSupabaseEnv()) {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 py-4 text-charcoal-950 sm:px-5 lg:px-6">
      <a href="#main-content" className="skip-link">
        Skip to main
      </a>
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[238px_1fr]">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white/8 bg-charcoal-950 px-4 py-5 text-ivory-50 shadow-soft lg:flex">
          <Link href={homeHref} className="block w-full rounded-[1.25rem]">
            <NGLogoLockup tone="light" subtext="Training" className="max-w-full" />
          </Link>
          <nav suppressHydrationWarning className="no-scrollbar mt-6 flex-1 space-y-2 overflow-y-auto px-2 py-2">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ivory-50/68 transition focus-visible:outline-offset-2",
                    active ? "bg-white/10 text-white shadow-inner-soft" : "hover:bg-white/6 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-bronze-200" : "text-ivory-50/40 group-hover:text-bronze-200")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-ivory-50/42">
            Version {appVersion}
          </div>
        </aside>

        <main id="main-content" suppressHydrationWarning className="min-w-0 scroll-mt-4 pb-28 lg:pb-5">
          <header className="mb-5 min-w-0 rounded-[1.5rem] border border-white/70 bg-white/52 p-5 shadow-soft backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
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
                  className="mt-2 text-wrap font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-charcoal-950 sm:text-5xl"
                >
                  {displayTitle}
                </motion.h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{subtitle}</p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[1.5rem] border border-stone-200/80 bg-white/72 p-2 shadow-inner-soft sm:rounded-full">
                <Avatar name={identity.name} src={identity.photo} />
                <div className="min-w-0 flex-1 pr-1 sm:pr-3">
                  <p className="truncate text-sm font-semibold">{identity.name}</p>
                  <p className="truncate text-xs text-stone-500">{identity.subtitle}</p>
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

      <nav
        suppressHydrationWarning
        aria-label={`${role} navigation`}
        className="no-scrollbar fixed inset-x-3 bottom-3 z-50 flex gap-1 overflow-x-auto overscroll-x-contain rounded-full border border-white/70 bg-charcoal-950/92 p-2 shadow-soft backdrop-blur-xl lg:hidden"
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.75rem] flex-none flex-col items-center gap-1 rounded-full px-3 py-2 text-center text-[10px] text-ivory-50/55",
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
