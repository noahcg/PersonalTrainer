"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { HeartPulse, MessageCircle, Send, X } from "lucide-react";
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
  const [checkInReply, setCheckInReply] = useState("");
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);
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

  const activeMessages = useMemo(
    () => messages.filter((message) => message.clientId === selectedClientId),
    [messages, selectedClientId],
  );
  const activeCheckIns = useMemo(
    () => checkIns.filter((checkIn) => checkIn.clientId === selectedClientId),
    [checkIns, selectedClientId],
  );
  const activeCheckIn = checkIns.find((checkIn) => checkIn.id === activeCheckInId) ?? null;

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

  async function reviewCheckIn() {
    if (!activeCheckIn || !selectedClient) return;

    setBusy(true);
    try {
      const reply = checkInReply.trim();
      let nextCheckIns = checkIns;
      let appendedMessage: Message | null = null;

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated trainer session to review check-ins.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();

        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const reviewedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("check_ins")
          .update({
            reviewed_at: reviewedAt,
            trainer_response: reply || null,
          })
          .eq("id", activeCheckIn.id);

        if (updateError) throw updateError;

        nextCheckIns = checkIns.map((checkIn) =>
          checkIn.id === activeCheckIn.id
            ? {
                ...checkIn,
                reviewed: true,
                trainerResponse: reply,
                reviewedAt: new Date(reviewedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : checkIn,
        );

        if (reply) {
          const { data: inserted, error: messageError } = await supabase
            .from("messages")
            .insert({
              trainer_id: trainer.id,
              client_id: selectedClient.id,
              sender_profile_id: user.id,
              kind: "message",
              body: reply,
            })
            .select("id, body, created_at")
            .single<{ id: string; body: string; created_at: string }>();

          if (messageError || !inserted) throw messageError ?? new Error("Unable to send trainer response.");

          appendedMessage = {
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
          };
        }
      } else {
        const reviewedAt = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        nextCheckIns = checkIns.map((checkIn) =>
          checkIn.id === activeCheckIn.id
            ? { ...checkIn, reviewed: true, trainerResponse: reply, reviewedAt }
            : checkIn,
        );
        setCheckIns(nextCheckIns);
        writeDemoCheckIns(nextCheckIns);

        if (reply) {
          const nextMessages = [
            ...messages,
            {
              id: `message-${Date.now()}`,
              from: "trainer" as const,
              author: brand.app.trainerLabel,
              body: reply,
              createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              clientId: selectedClient.id,
              clientName: selectedClient.name,
            },
          ];
          setMessages(nextMessages);
          writeDemoMessages(nextMessages);
          appendedMessage = nextMessages[nextMessages.length - 1];
        }
      }

      if (mode === "supabase") {
        setCheckIns(nextCheckIns);
        if (appendedMessage) {
          setMessages((current) => [...current, appendedMessage!]);
        }
      }

      setCheckInReply("");
      setActiveCheckInId(null);
      setStatus(reply ? "Check-in reviewed and reply sent." : "Check-in reviewed.");
      window.setTimeout(() => setStatus(null), 2000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to review check-in.");
      window.setTimeout(() => setStatus(null), 2200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="trainer" title="Messages" subtitle="Review client conversations and reply from one place so communication stays direct and usable.">
      <div className="grid gap-5 xl:grid-cols-[320px_1fr_360px]">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Inbox</p>
              <p className="mt-2 text-sm text-stone-500">{threads.length} client thread{threads.length === 1 ? "" : "s"}</p>
            </div>
            <Badge variant="dark">{messages.length} total</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedClientId(thread.id)}
                className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
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
            ))}
          </div>
        </Card>

        <Card className="p-5">
          {selectedClient ? (
            <>
              <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
                <Avatar name={selectedClient.name} src={selectedClient.photo} className="size-12" />
                <div>
                  <p className="text-lg font-semibold text-charcoal-950">{selectedClient.name}</p>
                  <p className="text-sm text-stone-500">Direct coaching conversation</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {activeMessages.length ? (
                  activeMessages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.from === "trainer" ? "justify-end" : ""}`}>
                      {message.from === "client" ? <Avatar name={message.author} src={selectedClient.photo} className="size-9" /> : null}
                      <div className={`max-w-[78%] rounded-[1.5rem] p-4 ${message.from === "trainer" ? "bg-charcoal-950 text-ivory-50" : "bg-stone-50"}`}>
                        <p className="text-sm leading-6">{message.body}</p>
                        <p className={`mt-2 text-xs ${message.from === "trainer" ? "text-ivory-50/50" : "text-stone-500"}`}>{message.createdAt}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm text-stone-500">
                    No messages yet. Start the conversation with a direct coaching note.
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${selectedClient.name}...`} />
                <Button variant="warm" onClick={sendMessage} disabled={busy}>
                  <Send className="size-4" />
                  {busy ? "Sending..." : "Send"}
                </Button>
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

        <Card className="p-5">
          {selectedClient ? (
            <>
              <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
                <HeartPulse className="size-5 text-bronze-600" />
                <div>
                  <p className="text-lg font-semibold text-charcoal-950">Check-ins</p>
                  <p className="text-sm text-stone-500">{selectedClient.name}&apos;s recovery updates</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {activeCheckIns.length ? (
                  activeCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-charcoal-950">{checkIn.date}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">{checkIn.reviewed ? "Reviewed" : "Open"}</p>
                        </div>
                        <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>{checkIn.reviewed ? "Reviewed" : "Open"}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
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
                            <p className="mt-1 font-semibold text-charcoal-950">{value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-stone-600">{checkIn.notes}</p>
                      {checkIn.trainerResponse ? (
                        <div className="mt-4 rounded-[1.25rem] bg-bronze-50 p-3 text-sm leading-6 text-stone-700">
                          <p className="font-semibold text-bronze-700">Your response</p>
                          <p className="mt-1">{checkIn.trainerResponse}</p>
                        </div>
                      ) : null}
                      <Button className="mt-4 w-full" variant="secondary" onClick={() => setActiveCheckInId(checkIn.id)}>
                        {checkIn.reviewed ? "Update response" : "Review and reply"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm text-stone-500">
                    No check-ins yet from this client.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-center text-stone-500">
              <div>
                <HeartPulse className="mx-auto size-8 text-stone-300" />
                <p className="mt-4 text-sm">No client selected.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog.Root open={Boolean(activeCheckIn)} onOpenChange={(open) => !open && setActiveCheckInId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/70 bg-ivory-50 p-6 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{selectedClient?.name}</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-stone-600">
                    Review this check-in and optionally send a response back into the conversation thread.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close review dialog">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>
              {activeCheckIn ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Energy", activeCheckIn.energy],
                      ["Soreness", activeCheckIn.soreness],
                      ["Sleep", activeCheckIn.sleep],
                      ["Stress", activeCheckIn.stress],
                      ["Motivation", activeCheckIn.motivation],
                      ["Mood", activeCheckIn.mood],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-stone-50 p-3">
                        <p className="text-xs text-stone-500">{label}</p>
                        <p className="mt-1 font-semibold text-charcoal-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm leading-6 text-stone-600">{activeCheckIn.notes}</p>
                  <Textarea
                    className="mt-5"
                    value={checkInReply}
                    onChange={(event) => setCheckInReply(event.target.value)}
                    placeholder="Recovery looks decent. Reduce hinge load 5% today and keep tempo strict."
                  />
                  <div className="mt-5 flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <Button variant="secondary">Cancel</Button>
                    </Dialog.Close>
                    <Button variant="warm" onClick={() => void reviewCheckIn()} disabled={busy}>
                      {busy ? "Saving..." : "Save review"}
                    </Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {status ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{status}</div> : null}
    </AppShell>
  );
}
