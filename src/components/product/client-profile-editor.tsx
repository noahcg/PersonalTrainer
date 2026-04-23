"use client";

import { useEffect, useState } from "react";
import { CalendarRange, ShieldPlus, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clients } from "@/lib/demo-data";

const storageKey = "aurelian-client-profile";

export function ClientProfileEditor() {
  const base = clients[0];
  const [profile, setProfile] = useState({
    goals: base.goals,
    availability: base.availability,
    injuries: base.injuries,
    notes: base.notes,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function saveProfile() {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    setMessage("Profile saved.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <AppShell role="client" title="Profile" subtitle="Keep your goals, limitations, schedule, and preferences current for better coaching.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
            <Badge variant="bronze">Client profile</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">The clearer your context, the better your coaching can adapt.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
              Keep goals, limitations, and schedule updated so each plan adjustment stays relevant and supportive.
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Goals", value: "Current", icon: Target, tone: "text-bronze-500" },
              { label: "Availability", value: "Saved", icon: CalendarRange, tone: "text-sage-700" },
              { label: "Limitations", value: "Visible", icon: ShieldPlus, tone: "text-charcoal-950" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <Card key={label} className="p-5">
                <Icon className={`size-5 ${tone}`} />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar name={base.name} src={base.photo} className="size-20" />
            <div>
              <CardTitle className="font-serif text-4xl">{base.name}</CardTitle>
              <p className="text-sm text-stone-500">{base.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input value={profile.goals} onChange={(event) => setProfile((current) => ({ ...current, goals: event.target.value }))} />
          <Input value={profile.availability} onChange={(event) => setProfile((current) => ({ ...current, availability: event.target.value }))} />
          <Textarea value={profile.injuries} onChange={(event) => setProfile((current) => ({ ...current, injuries: event.target.value }))} />
          <Textarea value={profile.notes} onChange={(event) => setProfile((current) => ({ ...current, notes: event.target.value }))} />
          <Button variant="warm" onClick={saveProfile}>Save profile</Button>
        </CardContent>
      </Card>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
