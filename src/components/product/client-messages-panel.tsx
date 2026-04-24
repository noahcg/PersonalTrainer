"use client";

import { useEffect, useState } from "react";
import { HeartPulse, MessageSquareText, NotebookPen } from "lucide-react";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { checkIns as demoCheckIns, messages as demoMessages } from "@/lib/demo-data";
import { readDemoCheckIns, writeDemoCheckIns } from "@/lib/demo-checkin-storage";
import { readDemoMessages, writeDemoMessages } from "@/lib/demo-message-storage";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { CheckIn, ConversationParticipant, Message } from "@/lib/types";

export function ClientMessagesPanel({
  initialParticipant,
  initialMessages,
  initialCheckIns,
  mode,
}: {
  initialParticipant: ConversationParticipant;
  initialMessages: Message[];
  initialCheckIns: CheckIn[];
  mode: "demo" | "supabase";
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(initialCheckIns);
  const [reply, setReply] = useState("");
  const [checkIn, setCheckIn] = useState({
    energy: "",
    soreness: "",
    sleep: "",
    stress: "",
    motivation: "",
    mood: "",
    notes: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readDemoMessages(demoMessages);
    const storedCheckIns = readDemoCheckIns(demoCheckIns);
    const timeout = window.setTimeout(() => {
      setMessages(stored.filter((item) => item.clientId === initialParticipant.id));
      setCheckIns(storedCheckIns.filter((item) => item.clientId === initialParticipant.id));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialParticipant.id, mode]);

  async function sendReply() {
    if (!reply.trim()) return;

    try {
      const body = reply.trim();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated client session to send messages.");

        const { data: client } = await supabase
          .from("clients")
          .select("id, trainer_id, full_name")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string; trainer_id: string; full_name: string }>();

        if (!client?.id || !client.trainer_id) throw new Error("Client profile not found.");

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            trainer_id: client.trainer_id,
            client_id: client.id,
            sender_profile_id: user.id,
            kind: "message",
            body,
          })
          .select("id, body, created_at")
          .single<{ id: string; body: string; created_at: string }>();

        if (error || !inserted) throw error ?? new Error("Unable to send message.");

        setMessages((current) => [
          ...current,
          {
            id: inserted.id,
            from: "client",
            author: client.full_name,
            body: inserted.body,
            createdAt: new Date(inserted.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            clientId: client.id,
            clientName: client.full_name,
          },
        ]);
      } else {
        const nextMessages = readDemoMessages(demoMessages);
        const nextMessage = {
          id: `message-${Date.now()}`,
          from: "client" as const,
          author: initialParticipant.name,
          body,
          createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          clientId: initialParticipant.id,
          clientName: initialParticipant.name,
        } satisfies Message;
        const merged = [...nextMessages, nextMessage];
        writeDemoMessages(merged);
        setMessages(merged.filter((item) => item.clientId === initialParticipant.id));
      }

      setReply("");
      setMessage("Reply sent.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send reply.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  async function submitCheckIn() {
    try {
      const payload = {
        energy: Number(checkIn.energy) || null,
        soreness: Number(checkIn.soreness) || null,
        sleep: Number(checkIn.sleep) || null,
        stress: Number(checkIn.stress) || null,
        motivation: Number(checkIn.motivation) || null,
        mood: checkIn.mood.trim() || null,
        notes: checkIn.notes.trim(),
      };

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated client session to submit a check-in.");

        const { data: client } = await supabase
          .from("clients")
          .select("id, full_name")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string; full_name: string }>();

        if (!client?.id) throw new Error("Client profile not found.");

        const { data: inserted, error } = await supabase
          .from("check_ins")
          .insert({
            client_id: client.id,
            energy: payload.energy,
            soreness: payload.soreness,
            sleep: payload.sleep,
            stress: payload.stress,
            motivation: payload.motivation,
            mood: payload.mood,
            notes: payload.notes,
          })
          .select("id, submitted_at")
          .single<{ id: string; submitted_at: string }>();

        if (error || !inserted) throw error ?? new Error("Unable to submit check-in.");

        setCheckIns((current) => [
          {
            id: inserted.id,
            clientId: client.id,
            client: client.full_name,
            date: new Date(inserted.submitted_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            energy: payload.energy ?? 0,
            soreness: payload.soreness ?? 0,
            sleep: payload.sleep ?? 0,
            stress: payload.stress ?? 0,
            motivation: payload.motivation ?? 0,
            mood: payload.mood ?? "",
            notes: payload.notes,
            reviewed: false,
            trainerResponse: "",
          },
          ...current,
        ]);
      } else {
        const nextCheckIn = {
          id: `checkin-${Date.now()}`,
          clientId: initialParticipant.id,
          client: initialParticipant.name,
          date: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          energy: payload.energy ?? 0,
          soreness: payload.soreness ?? 0,
          sleep: payload.sleep ?? 0,
          stress: payload.stress ?? 0,
          motivation: payload.motivation ?? 0,
          mood: payload.mood ?? "",
          notes: payload.notes,
          reviewed: false,
          trainerResponse: "",
        } satisfies CheckIn;

        const nextCheckIns = [nextCheckIn, ...readDemoCheckIns(demoCheckIns)];
        writeDemoCheckIns(nextCheckIns);
        setCheckIns(nextCheckIns.filter((item) => item.clientId === initialParticipant.id));
      }

      setCheckIn({ energy: "", soreness: "", sleep: "", stress: "", motivation: "", mood: "", notes: "" });
      setMessage("Check-in submitted.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit check-in.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  return (
    <AppShell role="client" title="Messages & check-ins" subtitle="Reply to coach notes and submit recovery context so your plan can adapt.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
            <Badge variant="bronze">{brand.app.communicationsBadge}</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">A calmer coaching relationship comes from clear notes, fast replies, and honest check-ins.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
              Use this space to keep your coach informed without friction. {brand.tagline}
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Messages", value: String(messages.length), icon: MessageSquareText, tone: "text-bronze-500" },
              { label: "Check-ins", value: String(checkIns.length), icon: HeartPulse, tone: "text-sage-700" },
              { label: "Coach replies", value: String(checkIns.filter((item) => item.trainerResponse).length), icon: NotebookPen, tone: "text-charcoal-950" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <Card key={label} className="p-5">
                <Icon className={`size-5 ${tone}`} />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <div className="space-y-4">
            {messages.map((messageItem) => (
              <div key={messageItem.id} className={`flex gap-3 ${messageItem.from === "client" ? "justify-end" : ""}`}>
                {messageItem.from === "trainer" && <Avatar name={messageItem.author} className="size-9" />}
                <div className={`max-w-[78%] rounded-[1.5rem] p-4 ${messageItem.from === "client" ? "bg-charcoal-950 text-ivory-50" : "bg-stone-50"}`}>
                  <p className="text-sm leading-6">{messageItem.body}</p>
                  <p className={`mt-2 text-xs ${messageItem.from === "client" ? "text-ivory-50/50" : "text-stone-500"}`}>{messageItem.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to Nick..." />
            <Button variant="warm" onClick={() => void sendReply()}>Send</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Submit check-in</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["energy", "Energy"],
              ["soreness", "Soreness"],
              ["sleep", "Sleep"],
              ["stress", "Stress"],
              ["motivation", "Motivation"],
              ["mood", "Mood"],
            ].map(([key, label]) => (
              <Input
                key={key}
                value={checkIn[key as keyof typeof checkIn]}
                onChange={(event) => setCheckIn((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={label}
              />
            ))}
          </div>
          <Textarea className="mt-3" value={checkIn.notes} onChange={(event) => setCheckIn((current) => ({ ...current, notes: event.target.value }))} placeholder="Anything your trainer should know?" />
          <Button className="mt-4 w-full" variant="warm" onClick={() => void submitCheckIn()}>Submit check-in</Button>
          <div className="mt-5 space-y-3">
            {checkIns.map((entry) => (
              <div key={entry.id} className="rounded-[1.35rem] bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-charcoal-950">{entry.date}</p>
                  <Badge variant={entry.reviewed ? "sage" : "bronze"}>{entry.reviewed ? "Reviewed" : "Pending"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{entry.notes || "No notes attached."}</p>
                {entry.trainerResponse ? (
                  <div className="mt-3 rounded-[1.1rem] bg-bronze-50 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-bronze-700">Coach response</p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{entry.trainerResponse}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
