"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
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
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
