"use client";

import { useEffect, useState } from "react";
import { HeartPulse, MessageSquareText, NotebookPen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { messages as initialMessages } from "@/lib/demo-data";
import type { Message } from "@/lib/types";

const storageKey = "aurelian-client-messages";

export function ClientMessagesPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        setMessages(JSON.parse(stored) as Message[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function persist(nextMessages: Message[]) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextMessages));
  }

  function sendReply() {
    if (!reply.trim()) return;
    const nextMessages = [
      ...messages,
      {
        id: `message-${messages.length + 1}`,
        from: "client",
        author: "Mara",
        body: reply.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      } satisfies Message,
    ];
    setMessages(nextMessages);
    persist(nextMessages);
    setReply("");
    setMessage("Reply sent.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  function submitCheckIn() {
    const summary = `Check-in: energy ${checkIn.energy || "—"}, soreness ${checkIn.soreness || "—"}, sleep ${checkIn.sleep || "—"}, stress ${checkIn.stress || "—"}, motivation ${checkIn.motivation || "—"}, mood ${checkIn.mood || "—"}. ${checkIn.notes}`.trim();
    const nextMessages = [
      ...messages,
      {
        id: `message-${messages.length + 1}`,
        from: "client",
        author: "Mara",
        body: summary,
        createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      } satisfies Message,
    ];
    setMessages(nextMessages);
    persist(nextMessages);
    setCheckIn({ energy: "", soreness: "", sleep: "", stress: "", motivation: "", mood: "", notes: "" });
    setMessage("Check-in submitted.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <AppShell role="client" title="Messages & check-ins" subtitle="Reply to coach notes and submit recovery context so your plan can adapt.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
            <Badge variant="bronze">Nick Glushien Coaching</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">A calmer coaching relationship comes from clear notes, fast replies, and honest check-ins.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
              Use this space to keep your coach informed without friction. Clear coaching. Real progress.
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Messages", value: String(messages.length), icon: MessageSquareText, tone: "text-bronze-500" },
              { label: "Check-ins", value: "Weekly", icon: HeartPulse, tone: "text-sage-700" },
              { label: "Coach notes", value: "Visible", icon: NotebookPen, tone: "text-charcoal-950" },
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
            <Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to Avery..." />
            <Button variant="warm" onClick={sendReply}>Send</Button>
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
          <Button className="mt-4 w-full" variant="warm" onClick={submitCheckIn}>Submit check-in</Button>
        </Card>
      </div>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
