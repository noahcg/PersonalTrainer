"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HeartPulse, MessageCircle, Search, Send, Users } from "lucide-react";
import { brand } from "@/lib/brand";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkIns as demoCheckIns, messages as demoMessages } from "@/lib/demo-data";
import { readDemoCheckIns } from "@/lib/demo-checkin-storage";
import { readDemoMessages, writeDemoMessages } from "@/lib/demo-message-storage";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { CheckIn, ConversationParticipant, Message } from "@/lib/types";

export function TrainerMessagesManager({
  initialParticipants,
  initialMessages,
  initialCheckIns,
  mode,
}: {
  initialParticipants: ConversationParticipant[];
  initialMessages: Message[];
  initialCheckIns: CheckIn[];
  mode: "demo" | "supabase";
}) {
  const participants = initialParticipants;
  const [messages, setMessages] = useState(initialMessages);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => initialParticipants[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readDemoMessages(demoMessages);
    const storedCheckIns = readDemoCheckIns(demoCheckIns);
    const timeout = window.setTimeout(() => {
      setMessages(stored);
      setCheckIns(storedCheckIns);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [mode]);

  const selectedClient = participants.find((participant) => participant.id === selectedClientId) ?? null;

  const threads = useMemo(() => {
    return participants.map((participant) => {
      const threadMessages = messages.filter((message) => message.clientId === participant.id);
      const latest = threadMessages[threadMessages.length - 1] ?? null;
      return {
        ...participant,
        latestPreview: latest?.body ?? "No messages yet.",
        latestTime: latest?.createdAt ?? "",
        total: threadMessages.length,
      };
    });
  }, [messages, participants]);

  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return threads;

    return threads.filter((thread) =>
      [thread.name, thread.latestPreview, thread.latestTime]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, threads]);

  const activeMessages = useMemo(
    () => messages.filter((message) => message.clientId === selectedClientId),
    [messages, selectedClientId],
  );
  const openCheckIns = useMemo(() => checkIns.filter((checkIn) => !checkIn.reviewed).length, [checkIns]);
  const reviewedCheckIns = useMemo(() => checkIns.filter((checkIn) => checkIn.reviewed).length, [checkIns]);

  async function sendMessage() {
    if (!selectedClient || !draft.trim()) return;

    setBusy(true);
    try {
      const body = draft.trim();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated trainer session to send messages.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();

        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            trainer_id: trainer.id,
            client_id: selectedClient.id,
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
            from: "trainer",
            author: brand.app.trainerLabel,
            body: inserted.body,
            createdAt: new Date(inserted.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            clientId: selectedClient.id,
            clientName: selectedClient.name,
          },
        ]);
      } else {
        const nextMessages = [
          ...messages,
          {
            id: `message-${Date.now()}`,
            from: "trainer" as const,
            author: brand.app.trainerLabel,
            body,
            createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            clientId: selectedClient.id,
            clientName: selectedClient.name,
          },
        ];
        setMessages(nextMessages);
        writeDemoMessages(nextMessages);
      }

      setDraft("");
      setStatus("Message sent.");
      window.setTimeout(() => setStatus(null), 1800);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send message.");
      window.setTimeout(() => setStatus(null), 2200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Communications workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">Messages and check-ins in one view.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Scan client threads, respond quickly, and clear open check-ins without losing the conversation context.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <CommunicationMetric icon={Users} label="Client threads" value={String(threads.length)} detail="Active roster" tone="text-charcoal-950" />
          <CommunicationMetric icon={MessageCircle} label="Messages" value={String(messages.length)} detail="All conversations" tone="text-bronze-500" />
          <CommunicationMetric icon={HeartPulse} label="Open check-ins" value={String(openCheckIns)} detail="Need review" tone="text-bronze-500" />
          <CommunicationMetric icon={CheckCircle2} label="Reviewed" value={String(reviewedCheckIns)} detail="Check-ins cleared" tone="text-sage-700" />
        </div>

        <div className="border-t border-border bg-stone-50/45 p-5 sm:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client threads or latest messages..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {status ? (
        <Card className="mb-5 border-bronze-200 bg-bronze-50/70 p-4 text-sm text-stone-700">
          {status}
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-white/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Inbox</p>
                <p className="mt-2 text-sm text-stone-500">{filteredThreads.length} shown</p>
              </div>
              <Badge variant="dark">{threads.length} total</Badge>
            </div>
          </div>
          <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
            {filteredThreads.length ? (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedClientId(thread.id)}
                  className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                    selectedClientId === thread.id ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/70 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={thread.name} src={thread.photo} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-charcoal-950">{thread.name}</p>
                        <span className="text-xs text-stone-400">{thread.latestTime}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-500">{thread.latestPreview}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.25rem] bg-stone-50 p-5 text-sm text-stone-500">
                No threads match that search.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-[620px] flex-col overflow-hidden p-0">
          {selectedClient ? (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-white/35 p-5">
                <Avatar name={selectedClient.name} src={selectedClient.photo} className="size-12" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-charcoal-950">{selectedClient.name}</p>
                  <p className="text-sm text-stone-500">Direct coaching conversation</p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {activeMessages.length ? (
                  activeMessages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.from === "trainer" ? "justify-end" : ""}`}>
                      {message.from === "client" ? <Avatar name={message.author} src={selectedClient.photo} className="size-9" /> : null}
                      <div className={`max-w-[86%] rounded-[1.25rem] p-4 sm:max-w-[78%] ${message.from === "trainer" ? "bg-charcoal-950 text-ivory-50" : "bg-stone-50"}`}>
                        <p className="text-sm leading-6">{message.body}</p>
                        <p className={`mt-2 text-xs ${message.from === "trainer" ? "text-ivory-50/50" : "text-stone-500"}`}>{message.createdAt}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] bg-stone-50 p-5 text-sm text-stone-500">
                    No messages yet. Start the conversation with a direct coaching note.
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-stone-50/45 p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${selectedClient.name}...`} />
                  <Button variant="warm" onClick={sendMessage} disabled={busy}>
                    <Send className="size-4" />
                    {busy ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-center text-stone-500">
              <div>
                <MessageCircle className="mx-auto size-8 text-stone-300" />
                <p className="mt-4 text-sm">No client selected.</p>
              </div>
            </div>
          )}
        </Card>

      </div>
    </>
  );
}

function CommunicationMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-stone-200/80 bg-white/72 p-4 shadow-inner-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">{label}</p>
        <Icon className={`size-4 shrink-0 ${tone}`} />
      </div>
      <p className="mt-4 font-serif text-3xl font-semibold leading-none text-charcoal-950">{value}</p>
      <p className="mt-2 truncate text-xs text-stone-500">{detail}</p>
    </div>
  );
}
