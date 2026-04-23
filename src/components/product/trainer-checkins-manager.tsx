"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { checkIns as initialCheckIns } from "@/lib/demo-data";
import type { CheckIn } from "@/lib/types";

const storageKey = "aurelian-trainer-checkins";

export function TrainerCheckinsManager() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>(initialCheckIns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        setCheckIns(JSON.parse(stored) as CheckIn[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const active = checkIns.find((item) => item.id === activeId) ?? null;

  function save(next: CheckIn[]) {
    setCheckIns(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function reviewAndReply() {
    if (!active) return;
    const next = checkIns.map((item) => (item.id === active.id ? { ...item, reviewed: true, notes: `${item.notes}\n\nCoach reply: ${reply.trim() || "Reviewed."}` } : item));
    save(next);
    setReply("");
    setActiveId(null);
  }

  return (
    <AppShell role="trainer" title="Check-ins" subtitle="Review readiness, recovery, mood, and freeform client context before adjusting training.">
      <div className="grid gap-5 lg:grid-cols-3">
        {checkIns.map((checkIn) => (
          <Card key={checkIn.id} className="p-1">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{checkIn.client}</CardTitle>
                  <p className="mt-1 text-sm text-stone-500">{checkIn.date}</p>
                </div>
                <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>{checkIn.reviewed ? "Reviewed" : "Open"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Energy", checkIn.energy],
                  ["Soreness", checkIn.soreness],
                  ["Sleep", checkIn.sleep],
                  ["Stress", checkIn.stress],
                  ["Motivation", checkIn.motivation],
                  ["Mood", checkIn.mood],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-600 whitespace-pre-line">{checkIn.notes}</p>
              <Button className="mt-5 w-full" variant="warm" onClick={() => setActiveId(checkIn.id)}>Review and reply</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog.Root open={Boolean(active)} onOpenChange={(open) => !open && setActiveId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/70 bg-ivory-50 p-6 shadow-soft">
              <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{active?.client}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-stone-600">Mark this check-in reviewed and append your coaching reply.</Dialog.Description>
              <Textarea className="mt-5" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Recovery looks decent. Reduce hinge load 5% today and keep tempo strict." />
              <div className="mt-5 flex justify-end gap-3">
                <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
                <Button variant="warm" onClick={reviewAndReply}>Save review</Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AppShell>
  );
}
